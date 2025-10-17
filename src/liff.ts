// src/liff.ts
import { setAccessToken } from './api';

// liff は動的 import（初期化失敗時もコンソールに出るように）
const loadLiff = () => import('@line/liff');

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string;
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.VITE_API_BASE as string);

let _resolveAuthReady: (() => void) | null = null;
const authReady = new Promise<void>((r) => (_resolveAuthReady = r));
export function whenAuthReady() {
  return authReady;
}

// ---- ループ対策フラグ（タブ単位） ----
const KEY_LOGIN_STARTED_AT = 'liff_login_started_at';
const KEY_LOGIN_DONE = 'liff_login_done'; // サーバーへの login 成功フラグ
const LOGIN_LOOP_WINDOW_MS = 5 * 60_000;  // 5分

function markLoginStart() {
  sessionStorage.setItem(KEY_LOGIN_STARTED_AT, String(Date.now()));
}
function clearLoginStart() {
  sessionStorage.removeItem(KEY_LOGIN_STARTED_AT);
}
function wasLoginJustStarted(withinMs = LOGIN_LOOP_WINDOW_MS) {
  const t = Number(sessionStorage.getItem(KEY_LOGIN_STARTED_AT) || 0);
  return !!t && Date.now() - t < withinMs;
}
function markLoginDone() {
  sessionStorage.setItem(KEY_LOGIN_DONE, '1');
}
function isLoginDone() {
  return sessionStorage.getItem(KEY_LOGIN_DONE) === '1';
}

function assertEnv() {
  if (!LIFF_ID) throw new Error('missing VITE_LIFF_ID');
  if (!API_BASE) throw new Error('missing VITE_API_BASE_URL (or VITE_API_BASE)');
}

async function serverLogin(idToken: string) {
  const url = API_BASE.replace(/\/+$/, '') + '/auth/login';
  console.log('[liff] POST', url);

  const r = await fetch(url, {
    method: 'POST',
    credentials: 'include', // refresh cookie を受け取る
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    console.error('[liff] login failed:', r.status, t);
    throw new Error(`login_failed:${r.status}`);
  }

  const json = (await r.json().catch(() => ({}))) as any;
  const at: string | undefined = json?.accessToken ?? json?.access_token;
  if (!at) throw new Error('no_access_token_from_server');

  setAccessToken(at);
  markLoginDone();
  console.log('[liff] login success & access token set');
}

/**
 * 可能な限り re-login を避ける版：
 * - 「ログインしていない」時だけ liff.login() を呼ぶ
 * - id_token の鮮度チェックは行わない（LINE 側で有効な値を返す前提）
 * - 直前に login を開始していたら、ループ保護で止める
 */
export async function initLiff() {
  try {
    assertEnv();
    console.log('[liff] boot', { href: location.href });

    const { default: liff } = await loadLiff();
    console.log('[liff] got liff from module');

    await liff.init({ liffId: LIFF_ID });
    await liff.ready;

    const loggedIn = typeof liff.isLoggedIn === 'function' ? liff.isLoggedIn() : false;
    console.log('[liff] ready, loggedIn=', loggedIn);

    // すでにこのタブでサーバー login 済みなら、何もしない
    if (isLoginDone()) {
      console.log('[liff] already server-logged-in in this tab → skip login flow');
      _resolveAuthReady?.();
      return;
    }

    // ログインしていない → 一度だけ login を発火
    if (!loggedIn) {
      if (wasLoginJustStarted()) {
        console.error('[liff] login loop detected. aborting this cycle.');
        return; // ここで止める（ユーザー操作 or 別タブで再試行）
      }
      console.log('[liff] not logged in → call liff.login()');
      markLoginStart();
      await liff.login({ redirectUri: location.href });
      return; // ここから先は基本戻らない
    }

    // ここに来るのは「LINEログインは済んでいるが、サーバー未ログイン」のケース
    // idToken をそのまま使う（鮮度チェックは行わない）
    const idToken = liff.getIDToken();
    console.log('[liff] idToken exists?', !!idToken);
    if (!idToken) {
      // 通常ここには来ないが、念のためループ保護
      if (wasLoginJustStarted()) {
        console.error('[liff] login loop detected without idToken. aborting.');
        return;
      }
      console.log('[liff] no idToken → liff.login()');
      markLoginStart();
      await liff.login({ redirectUri: location.href });
      return;
    }

    await serverLogin(idToken);
    clearLoginStart();
    _resolveAuthReady?.();
  } catch (e) {
    console.error('[liff] init failed:', e);
    // 失敗しても resolve して画面を固まらせない（/profile 等は API 失敗表示になるだけ）
    _resolveAuthReady?.();
  }
}