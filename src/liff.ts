// src/liff.ts
/* eslint-disable no-console */
import { setAccessToken } from './api';

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string;
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.VITE_API_BASE as string);

let _resolveAuthReady: (() => void) | null = null;
const authReady = new Promise<void>((r) => (_resolveAuthReady = r));
export function whenAuthReady() { return authReady; }

const LOGIN_IN_PROGRESS_KEY = 'liff_login_in_progress';

// ---- debug dump (最初に出す) ----
(function debugBoot() {
  const mask = (s?: string) => (s ? s.slice(0, 3) + '***' + s.slice(-3) : s);
  console.log('[liff.ts] boot',
    { LIFF_ID: mask(LIFF_ID), API_BASE: API_BASE || '(missing)' });
})();

export async function forceReLogin() {
  try { (window as any).liff?.logout?.(); } catch {}
  location.href = `https://liff.line.me/${LIFF_ID}?redirect=${encodeURIComponent(location.href)}`;
}

// ---- SDK ローダ（モジュール → グローバルの順に試す）----
async function loadLiff(): Promise<any> {
  try {
    const mod = await import(/* @vite-ignore */ '@line/liff');
    // 一部ビルド環境で default じゃない事があるため両対応
    const liff = (mod as any).default ?? (mod as any);
    if (liff?.init) {
      console.log('[liff.ts] got liff from module');
      (window as any).__liffSource = 'module';
      return liff;
    }
    throw new Error('module_loaded_but_invalid');
  } catch (e) {
    console.warn('[liff.ts] module import failed, fallback to global SDK', e);
    // グローバル SDK を読み込み
    await new Promise<void>((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
      s.async = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error('global_sdk_load_failed'));
      document.head.appendChild(s);
    });
    const liff = (window as any).liff;
    if (!liff?.init) throw new Error('global_sdk_missing_init');
    console.log('[liff.ts] got liff from global');
    (window as any).__liffSource = 'global';
    return liff;
  }
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

async function getIdTokenEnsured(liff: any): Promise<string> {
  let idt = liff.getIDToken?.();

  if (!idt || isIdTokenExpiringOrExpired(idt)) {
    if (isLoginLooping()) throw new Error('login_loop_detected');
    console.log('[liff.ts] idToken missing/stale → re-login');
    markLoginStart();
    await liff.login({ redirectUri: location.href });
    idt = liff.getIDToken?.();
    clearLoginMark();
  }
  if (!idt) throw new Error('failed_to_get_id_token');
  return idt;
}

async function serverLogin(idToken: string) {
  if (!API_BASE) throw new Error('missing VITE_API_BASE_URL (or VITE_API_BASE)');
  const url = API_BASE.replace(/\/+$/, '') + '/auth/login';
  console.log('[liff.ts] POST', url);

  const r = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    console.error('[liff.ts] login failed:', r.status, t);
    throw new Error(`login_failed:${r.status}`);
  }

  const json = await r.json().catch(() => ({}));
  const at: string | undefined = json?.accessToken ?? json?.access_token;
  if (!at) throw new Error('no_access_token_from_server');

  setAccessToken(at);
  console.log('[liff.ts] got access token');
}

export async function initLiff() {
  try {
    if (!LIFF_ID) throw new Error('missing VITE_LIFF_ID');

    const liff = await loadLiff();

    await liff.init({ liffId: LIFF_ID });
    await liff.ready;
    console.log('[liff.ts] ready, loggedIn=', liff.isLoggedIn?.());

    if (!liff.isLoggedIn?.()) {
      if (isLoginLooping()) {
        console.error('[liff.ts] login loop detected — abort this cycle.');
        return;
      }
      console.log('[liff.ts] not logged in → login');
      markLoginStart();
      await liff.login({ redirectUri: location.href });
      return;
    }

    console.log('[liff.ts] idToken exists?', !!liff.getIDToken?.());
    const idt = await getIdTokenEnsured(liff);
    console.log('[liff.ts] idToken len=', idt.length);

    await serverLogin(idt);

    clearLoginMark();
    _resolveAuthReady?.();
  } catch (err) {
    (window as any).__liffInitError = String(err && (err as any).message || err);
    console.error('[liff.ts] init failed:', err);
    // ここは UI を止めたいだけなので throw しない
  }
}