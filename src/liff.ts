// src/liff.ts
import liff from '@line/liff';
import { setAccessToken } from './api';

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string;
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || (import.meta.env.VITE_API_BASE as string);

let _resolveAuthReady: (() => void) | null = null;
const authReady = new Promise<void>((r) => { _resolveAuthReady = r; });
export function whenAuthReady() { return authReady; }

// 二重初期化防止
let initializing = false;
let initialized = false;

// ループ防止キー（タブ毎）
const LOGIN_IN_PROGRESS_KEY = 'liff_login_in_progress';

export async function forceReLogin() {
  try { liff.logout(); } catch {}
  await liff.login({ redirectUri: location.href });
}

function parseJwt<T = any>(token: string): T {
  const [, payload] = token.split('.');
  return JSON.parse(decodeURIComponent(escape(atob(payload))));
}
function isIdTokenExpiringOrExpired(idToken: string, skewMs = 30_000) {
  try {
    const payload = parseJwt<{ exp?: number }>(idToken);
    if (!payload?.exp) return true;
    return payload.exp * 1000 < Date.now() + skewMs;
  } catch { return true; }
}
function markLoginStart() {
  sessionStorage.setItem(LOGIN_IN_PROGRESS_KEY, String(Date.now()));
}
function clearLoginMark() {
  sessionStorage.removeItem(LOGIN_IN_PROGRESS_KEY);
}
function isLoginLooping(withinMs = 60_000) {
  const t = Number(sessionStorage.getItem(LOGIN_IN_PROGRESS_KEY) || 0);
  return !!t && Date.now() - t < withinMs;
}

async function getIdTokenEnsured(): Promise<string> {
  let idt = liff.getIDToken();
  if (!idt || isIdTokenExpiringOrExpired(idt)) {
    if (isLoginLooping()) throw new Error('login_loop_detected');
    markLoginStart();
    await liff.login({ redirectUri: location.href });
    idt = liff.getIDToken();
    clearLoginMark();
  }
  if (!idt) throw new Error('failed_to_get_id_token');
  return idt;
}

async function serverLogin(idToken: string) {
  if (!API_BASE) throw new Error('missing VITE_API_BASE_URL (or VITE_API_BASE)');
  const url = API_BASE.replace(/\/+$/, '') + '/auth/login';
  const r = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!r.ok) {
    const t = await r.text().catch(()=>'');
    throw new Error(`login_failed:${r.status} ${t}`);
  }
  const json = await r.json().catch(()=> ({}));
  const at: string | undefined = json?.accessToken ?? json?.access_token;
  if (!at) throw new Error('no_access_token_from_server');
  setAccessToken(at); // ← api.ts 側で localStorage にも保存（後述）
}

export async function initLiff() {
  if (initialized || initializing) return; // 二重起動防止
  initializing = true;

  try {
    if (!LIFF_ID) throw new Error('missing VITE_LIFF_ID');
    await liff.init({ liffId: LIFF_ID });
    await liff.ready;

    if (!liff.isLoggedIn?.()) {
      if (isLoginLooping()) return; // ループ止め
      markLoginStart();
      await liff.login({ redirectUri: location.href });
      return; // ここでリダイレクトするので以降は走らない
    }

    const idt = await getIdTokenEnsured();
    await serverLogin(idt);

    clearLoginMark();
    initialized = true;
    _resolveAuthReady?.();
  } finally {
    initializing = false;
  }
}