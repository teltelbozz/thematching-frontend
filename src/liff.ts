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
  // LIFFのlogin()は、すでにログイン済みでも呼ぶとトークンをリフレッシュできます
  await liff.login(); // scopeはLIFF設定(openid, profile)で付与
}

export function logout() {
  if (liff.isLoggedIn()) {
    liff.logout();
    location.reload();
  }
}

export function getIDToken(): string | null {
  return liff.getIDToken() || null;
}

export function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/** 有効期限をチェックし、切れている/近い場合は再ログインして新しいid_tokenを取る */
export async function ensureFreshIdToken(minMsLeft = 60_000): Promise<string> {
  if (!isLoggedIn()) {
    await login(); // リダイレクト→戻ってくる
  }
  let token = getIDToken();
  let expLeft = 0;

  if (token) {
    const p = decodeJwtPayload(token);
    if (p?.exp) expLeft = p.exp * 1000 - Date.now();
  }
  // 期限切れ or 残りわずか → 再ログインでリフレッシュ
  if (!token || expLeft < minMsLeft) {
    await login(); // 再ログインでid_token更新
    token = getIDToken();
    if (!token) throw new Error('Failed to get fresh ID token');
  }
  return token;
}