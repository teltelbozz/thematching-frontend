import liff from '@line/liff';

/** LIFF 初期化 */
export async function initLiff() {
  const id = import.meta.env.VITE_LIFF_ID;
  if (!id) throw new Error('VITE_LIFF_ID is missing');
  await liff.init({ liffId: id });
}

/** ログイン状態 */
export function isLoggedIn() {
  return liff.isLoggedIn();
}

/** ログイン（scopeはLINE Devの設定を使用）*/
export async function login() {
  if (!liff.isLoggedIn()) {
    await liff.login(); // scopeはLIFF設定(openid, profile)に依存
  }
}

/** ログアウト */
export function logout() {
  if (liff.isLoggedIn()) {
    liff.logout();
    location.reload();
  }
}

/** IDトークン（常に“新しく”取得） */
export function getFreshIDToken(): string | null {
  // liff.getIDToken() は毎回“現在の有効なトークン”を返す
  const token = liff.getIDToken();
  return token || null;
}

/** デバッグ：JWTのexp/iat確認（バリデーション無し） */
export function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}