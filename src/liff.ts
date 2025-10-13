// src/liff.ts
import liff from '@line/liff';
import { setAccessToken } from './api';

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string;
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.VITE_API_BASE as string);

let _resolveAuthReady: (() => void) | null = null;
let _rejectAuthReady: ((err: any) => void) | null = null;
const authReady = new Promise<void>((resolve, reject) => {
  _resolveAuthReady = resolve;
  _rejectAuthReady = reject;
});
export function whenAuthReady() {
  return authReady;
}

// 再入防止
let initializing = false;
let initialized = false;

// ループ防止用キー（タブ毎）
const LOGIN_IN_PROGRESS_KEY = 'liff_login_in_progress';

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

// --- id_token の事前期限チェック ---
function parseJwt<T = any>(token: string): T {
  const [, payload] = token.split('.');
  return JSON.parse(decodeURIComponent(escape(atob(payload))));
}

function isIdTokenExpiringOrExpired(idToken: string, skewMs = 30_000) {
  try {
    const payload = parseJwt<{ exp?: number }>(idToken);
    if (!payload?.exp) return true;
    return payload.exp * 1000 < Date.now() + skewMs;
  } catch {
    return true;
  }
}

async function getIdTokenEnsured(): Promise<string> {
  let idt = liff.getIDToken();

  if (!idt || isIdTokenExpiringOrExpired(idt)) {
    if (isLoginLooping()) throw new Error('login_loop_detected');
    console.log('[liff] idToken missing/stale → re-login');
    markLoginStart();
    await liff.login({ redirectUri: location.href });
    // 以降通常はリダイレクトされるので戻らないが、戻った時の保険
    idt = liff.getIDToken();
    clearLoginMark();
  }

  if (!idt) throw new Error('failed_to_get_id_token');
  return idt;
}

async function serverLogin(idToken: string) {
  if (!API_BASE) throw new Error('missing VITE_API_BASE_URL (or VITE_API_BASE)');

  const url = API_BASE.replace(/\/+$/, '') + '/auth/login';
  console.log('[api] POST', url);

  const r = await fetch(url, {
    method: 'POST',
    credentials: 'include', // refresh cookie を受け取る
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    console.error('[api] login failed:', r.status, t);
    throw new Error(`login_failed:${r.status}`);
  }

  const json = (await r.json().catch(() => ({}))) as any;
  // サーバの返却表記ゆれに対応
  const at: string | undefined = json?.accessToken ?? json?.access_token;
  if (!at) throw new Error('no_access_token_from_server');

  setAccessToken(at);
  console.log('[api] got access token');
}

export async function initLiff() {
  if (initialized || initializing) {
    return;
  }
  initializing = true;

  try {
    if (!LIFF_ID) throw new Error('missing VITE_LIFF_ID');

    console.log('[liff] init start');
    await liff.init({ liffId: LIFF_ID });
    await liff.ready;

    if (!liff.isLoggedIn?.()) {
      if (isLoginLooping()) {
        console.error('[liff] login loop detected. abort this cycle.');
        _resolveAuthReady?.(); // ハング防止：とにかく先へ進める
        initialized = true;
        initializing = false;
        return;
      }
      console.log('[liff] not logged in → login');
      markLoginStart();
      await liff.login({ redirectUri: location.href });
      return; // 通常ここでリダイレクト
    }

    console.log('[liff] logged in. idToken exists?', !!liff.getIDToken());
    const idt = await getIdTokenEnsured(); // 期限チェック＋必要なら取り直し
    await serverLogin(idt);

    clearLoginMark();
    _resolveAuthReady?.();
    initialized = true;
    console.log('[liff] init completed');
  } catch (e) {
    console.error('[liff] init failed', e);
    // ここで resolve しておくことで真っ暗ハングを回避（画面側で分岐可能に）
    _resolveAuthReady?.();
  } finally {
    initializing = false;
  }
}