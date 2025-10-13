// src/liff.ts
import liff from '@line/liff';
import { setAccessToken } from './api';

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string;
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.VITE_API_BASE as string);

let _resolveAuthReady: (() => void) | null = null;
const authReady = new Promise<void>((r) => {
  _resolveAuthReady = r;
});
export function whenAuthReady() {
  return authReady;
}

// --- 設定値 ---
const LOGIN_IN_PROGRESS_KEY = 'liff_login_in_progress';
const SKEW_MS = 5 * 60 * 1000; // 5分猶予（jwt expired対策）

export async function forceReLogin() {
  try {
    liff.logout();
  } catch (e) {
    console.warn('[liff] logout failed (ignored):', e);
  }
  await liff.login({ redirectUri: location.href });
}

// --- JWT デコードヘルパー ---
function parseJwt<T = any>(token: string): T {
  const [, payload] = token.split('.');
  return JSON.parse(decodeURIComponent(escape(atob(payload))));
}

// --- IDトークン期限チェック ---
function isIdTokenExpiringOrExpired(idToken: string, skewMs = SKEW_MS) {
  try {
    const payload = parseJwt<{ exp?: number }>(idToken);
    if (!payload?.exp) return true;
    const expMs = payload.exp * 1000;
    const expired = expMs < Date.now() + skewMs;
    if (expired) {
      console.warn(
        `[liff] id_token expiring soon/expired. exp=${new Date(expMs).toISOString()}`
      );
    }
    return expired;
  } catch (e) {
    console.warn('[liff] failed to parse id_token:', e);
    return true;
  }
}

// --- ループ防止 ---
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

// --- IDトークン確保 ---
async function getIdTokenEnsured(): Promise<string> {
  let idt = liff.getIDToken();

  if (!idt || isIdTokenExpiringOrExpired(idt)) {
    if (isLoginLooping()) throw new Error('login_loop_detected');
    console.log('[liff] idToken missing/stale → re-login');
    markLoginStart();
    await liff.login({ redirectUri: location.href });
    idt = liff.getIDToken();
    clearLoginMark();
  }

  if (!idt) throw new Error('failed_to_get_id_token');
  return idt;
}

// --- サーバーログイン ---
async function serverLogin(idToken: string) {
  if (!API_BASE) throw new Error('missing VITE_API_BASE_URL (or VITE_API_BASE)');
  const url = API_BASE.replace(/\/+$/, '') + '/auth/login';
  console.log('[api] POST', url);

  const r = await fetch(url, {
    method: 'POST',
    credentials: 'include', // refresh cookie 受け取り
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    console.error('[api] login failed:', r.status, t);

    // 一度だけ強制再ログイン
    if ((r.status === 401 || r.status === 500) && !isLoginLooping()) {
      console.warn('[api] retry login due to expired id_token');
      markLoginStart();
      await liff.login({ redirectUri: location.href });
    }

    throw new Error(`login_failed:${r.status}`);
  }

  const json = await r.json().catch(() => ({}));
  const at: string | undefined = json?.accessToken ?? json?.access_token;
  if (!at) throw new Error('no_access_token_from_server');

  setAccessToken(at);
  console.log('[api] got access token');
}

// --- 初期化 ---
export async function initLiff() {
  if (!LIFF_ID) throw new Error('missing VITE_LIFF_ID');

  await liff.init({ liffId: LIFF_ID });
  await liff.ready;

  if (!liff.isLoggedIn?.()) {
    if (isLoginLooping()) {
      console.error('[liff] login loop detected. aborting this cycle.');
      return;
    }
    console.log('[liff] not logged in → login');
    markLoginStart();
    await liff.login({ redirectUri: location.href });
    return;
  }

  console.log('[liff] logged in. idToken exists?', !!liff.getIDToken());
  const idt = await getIdTokenEnsured();
  await serverLogin(idt);

  clearLoginMark();
  _resolveAuthReady?.();
}