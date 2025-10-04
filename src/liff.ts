// src/liff.ts
import liff from '@line/liff';
import { setAccessToken } from './api';

// --- 環境変数（どちらかが定義されていればOK） -----------------------------
const LIFF_ID = import.meta.env.VITE_LIFF_ID as string;
const API_BASE =
  (import.meta.env.VITE_API_BASE as string) ||
  (import.meta.env.VITE_API_BASE_URL as string);

// --- 起動時の認証完了を待つための Promise ---------------------------------
let _resolveAuthReady: (() => void) | null = null;
/** initLiff() がアクセストークンをセットし終わったら resolve されます */
const authReady = new Promise<void>((resolve) => {
  _resolveAuthReady = resolve;
});

/** 画面側はこれを await してから API を叩く */
export function whenAuthReady() {
  return authReady;
}

// ---------------------------------------------------------------------------

/** 必要なら再ログインを強制（ループ防止のため画面にボタンを置いて呼び出す想定） */
export async function forceReLogin() {
  try {
    liff.logout();
  } catch {}
  await liff.login({ redirectUri: location.href });
}

/** id_token を取得。無ければ login を促す */
async function getIdTokenEnsured(): Promise<string> {
  let idt = liff.getIDToken();
  if (!idt) {
    // 未ログイン or 期限切れ → ログインフローへ
    console.log('[liff] no idToken -> login');
    await liff.login({ redirectUri: location.href });
    // login は通常ここでリダイレクトされるため、戻って来た時点では id_token が入っている
    idt = liff.getIDToken();
  }
  if (!idt) throw new Error('failed_to_get_id_token');
  return idt;
}

/** サーバにログイン（/api/auth/login）して access_token をセット */
async function serverLoginWithIdToken(idToken: string) {
  if (!API_BASE) throw new Error('missing VITE_API_BASE (or VITE_API_BASE_URL)');
  const url = API_BASE.replace(/\/+$/, '') + '/auth/login';

  console.log('[api] POST', url);
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // refresh cookie を受け取るため include 必須
    credentials: 'include',
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    console.error('[api] login failed:', r.status, txt);
    throw new Error(`login_failed:${r.status}`);
  }

  const json = await r.json().catch(() => ({}));
  const at = json?.access_token as string | undefined;
  if (!at) throw new Error('no_access_token_from_server');

  setAccessToken(at);
  console.log('[api] got access token');
}

/** LIFF 初期化 → id_token 取得 → バックエンドログイン完了まで */
export async function initLiff() {
  if (!LIFF_ID) throw new Error('missing VITE_LIFF_ID');

  // すでに初期化済みならスキップ（liff.ready を待つだけ）
  if (!liff.isApiAvailable || !(liff as any)._initDone) {
    await liff.init({ liffId: LIFF_ID });
  }
  await liff.ready;

  // LIFF 上でユーザーがログインしていなければログイン
  if (!liff.isLoggedIn?.()) {
    console.log('[liff] not logged in -> login');
    await liff.login({ redirectUri: location.href });
    return; // ここで基本的にリダイレクトされる
  }

  // id_token を確保
  console.log('[liff] idToken present? ->', !!liff.getIDToken());
  const idToken = await getIdTokenEnsured();

  // API: /auth/login して access_token を確保
  await serverLoginWithIdToken(idToken);

  // ここまで来れば画面側は API を安全に叩ける
  _resolveAuthReady?.();
}

/** デバッグ用（ブラウザで id_token を覗きたい時） */
export function debugPrintIdToken() {
  console.log('[liff] id_token =', liff.getIDToken());
}