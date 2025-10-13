// src/liff.ts
import liff from '@line/liff';
import { setAccessToken } from './api';

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string;
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.VITE_API_BASE as string);

let _resolveAuthReady: (() => void) | null = null;
const authReady = new Promise<void>((r) => (_resolveAuthReady = r));
export function whenAuthReady() { return authReady; }

// ループ防止用キー（タブ毎）
const LOGIN_IN_PROGRESS_KEY = 'liff_login_in_progress';

// ---- Base64URL / JWT ユーティリティ ----
function b64urlToUtf8(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=');
  // atob は Latin1 を返すので UTF-8 に復元
  return decodeURIComponent(escape(atob(b64)));
}

function parseJwt<T = any>(token: string): T {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('invalid_jwt');
  return JSON.parse(b64urlToUtf8(parts[1]));
}

// 期限チェック（デフォ猶予 5 分）
function isIdTokenExpiringOrExpired(idToken: string, skewMs = 300_000) {
  try {
    const payload = parseJwt<{ exp?: number }>(idToken);
    if (!payload?.exp) return true; // expが無いトークンは無効扱い
    return payload.exp * 1000 < Date.now() + skewMs;
  } catch {
    return true; // パースできなければ取り直し
  }
}

function markLoginStart() {
  sessionStorage.setItem(LOGIN_IN_PROGRESS_KEY, String(Date.now()));
}
function clearLoginMark() {
  sessionStorage.removeItem(LOGIN_IN_PROGRESS_KEY);
}
function isLoginLooping(withinMs = 120_000) {
  const t = Number(sessionStorage.getItem(LOGIN_IN_PROGRESS_KEY) || 0);
  return !!t && Date.now() - t < withinMs;
}

export async function forceReLogin() {
  try { liff.logout(); } catch {}
  markLoginStart();
  await liff.login({ redirectUri: location.href });
}

// 期限を見て、必要なら再ログインして新しい id_token を取る
async function getIdTokenEnsured(): Promise<string> {
  let idt = liff.getIDToken();

  if (!idt || isIdTokenExpiringOrExpired(idt)) {
    if (isLoginLooping()) throw new Error('login_loop_detected'); // 無限遷移の保護
    console.log('[liff] idToken missing/stale -> force re-login');
    await forceReLogin();
    // 通常はここに戻らないが、戻ってきた場合に備え再取得
    idt = liff.getIDToken();
    clearLoginMark();
  }

  if (!idt) throw new Error('failed_to_get_id_token');
  return idt;
}

// サーバへログイン
async function serverLogin(idToken: string) {
  if (!API_BASE) throw new Error('missing VITE_API_BASE_URL (or VITE_API_BASE)');
  const url = API_BASE.replace(/\/+$/, '') + '/auth/login';

  // 送信直前に payload をログ（開発用）
  try {
    const p: any = parseJwt(idToken);
    console.log('[liff] id_token exp:', p?.exp, 'iat:', p?.iat, 'now(sec):', Math.floor(Date.now()/1000));
  } catch (e) {
    console.warn('[liff] failed to decode id_token before send:', e);
  }

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
  // サーバ実装差異に合わせ、両表記に対応
  const at: string | undefined = json?.accessToken ?? json?.access_token;
  if (!at) throw new Error('no_access_token_from_server');

  setAccessToken(at);
  console.log('[api] got access token');
}

export async function initLiff() {
  if (!LIFF_ID) throw new Error('missing VITE_LIFF_ID');

  await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true });
  await liff.ready;

  if (!liff.isLoggedIn?.()) {
    if (isLoginLooping()) {
      // 絶対ループを止める最後の砦
      console.error('[liff] login loop detected. aborting this cycle.');
      return;
    }
    console.log('[liff] not logged in -> login');
    await forceReLogin();
    return;
  }

  console.log('[liff] logged in. idToken exists? ->', !!liff.getIDToken());
  const idt = await getIdTokenEnsured(); // ここで鮮度チェックと取り直し
  await serverLogin(idt);

  clearLoginMark();
  _resolveAuthReady?.();
}