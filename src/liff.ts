import liff from '@line/liff';

/**
 * LIFF 初期化
 */
export async function initLiff() {
  const id = import.meta.env.VITE_LIFF_ID;
  if (!id) throw new Error('VITE_LIFF_ID is missing');
  await liff.init({ liffId: id });
}

/**
 * ログイン状態（LIFF視点）
 */
export function isLoggedIn() {
  return liff.isLoggedIn();
}

/**
 * id_token を取得（exp を見て古ければ再ログイン）
 * @param maxSkewMs 許容する最大“古さ”（ミリ秒）
 */
export async function ensureFreshIdToken(maxSkewMs = 60_000): Promise<string> {
  if (!liff.isLoggedIn()) {
    // 初回は LIFF 側のログインから
    liff.login();
    // 以降はリダイレクト復帰
    await new Promise<never>(() => {}); // ここには戻らない
  }

  const token = liff.getIDToken();
  const decoded = liff.getDecodedIDToken() as any | null;
  const nowSec = Math.floor(Date.now() / 1000);

  // token が無い／exp が過去／“ほぼ期限切れ”
  const isStale =
    !token ||
    !decoded?.exp ||
    decoded.exp - nowSec <= Math.ceil(maxSkewMs / 1000);

  if (isStale) {
    // 再ログインで id_token を更新
    liff.login();
    await new Promise<never>(() => {});
  }

  const fresh = liff.getIDToken();
  if (!fresh) throw new Error('Failed to acquire LIFF id_token');
  return fresh;
}

/**
 * 強制再ログイン（ユーザー操作でループを断ち切る用）
 */
export async function forceReLogin(): Promise<string> {
  liff.login();
  await new Promise<never>(() => {});
}

/**
 * ログアウト＆再読込
 */
export function logoutAndReload() {
  try {
    liff.logout();
  } finally {
    location.replace(location.href.split('#')[0]);
  }
}

/**
 * 短時間のループ防止（API ベースURL単位でキー分離）
 */
const API_BASE = import.meta.env.VITE_API_BASE || '';
const ATTEMPT_KEY = `login:lastAttempt:${API_BASE}`;
const COOLDOWN_MS = 8000; // 8秒

export async function maybeLoginOnce<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const last = Number(localStorage.getItem(ATTEMPT_KEY) || '0');

  if (last && now - last < COOLDOWN_MS) {
    throw new Error('Login already attempted recently. Avoiding loop.');
  }

  localStorage.setItem(ATTEMPT_KEY, String(now));
  try {
    const r = await fn();
    localStorage.removeItem(ATTEMPT_KEY); // 成功時は解除
    return r;
  } catch (e) {
    // 失敗でも一定時間で解除される（永続ループ防止）
    setTimeout(() => localStorage.removeItem(ATTEMPT_KEY), COOLDOWN_MS);
    throw e;
  }
}