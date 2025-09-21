import liff from '@line/liff';

export async function initLiff() {
  const id = import.meta.env.VITE_LIFF_ID;
  if (!id) throw new Error('VITE_LIFF_ID is missing');
  await liff.init({ liffId: id });
}

export function isLoggedIn() {
  return liff.isLoggedIn();
}

export async function login() {
  await liff.login(); // scopeはLIFF設定(openid, profile)
}

export function logout() {
  if (liff.isLoggedIn()) { liff.logout(); location.reload(); }
}

export function getIDToken(): string | null {
  return liff.getIDToken() || null;
}
export function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

/** 残りminMsLeft未満なら再ログインしてid_tokenを更新 */
export async function ensureFreshIdToken(minMsLeft = 60_000): Promise<string> {
  if (!isLoggedIn()) await login();
  let token = getIDToken();
  let left = 0;
  if (token) {
    const p = decodeJwtPayload(token);
    if (p?.exp) left = p.exp * 1000 - Date.now();
  }
  if (!token || left < minMsLeft) {
    await login();                     // ★ここで新しい id_token に更新させる
    token = getIDToken();
    if (!token) throw new Error('Failed to get fresh ID token');
  }
  return token;
}

/** 完全にセッションを捨てて取り直す（ボタン用） */
export async function forceReLogin(): Promise<string> {
  if (liff.isLoggedIn()) liff.logout();
  const url = location.origin + location.pathname + '?t=' + Date.now();
  await liff.login({ redirectUri: url });
  const t = liff.getIDToken();
  if (!t) throw new Error('No ID token after force login');
  return t;
}