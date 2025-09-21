import liff from '@line/liff';

const LOGIN_FLAG_KEY = 'liff-login-tried-at'; // ページ内でのlogin多重実行防止用
const LOGIN_FLAG_WINDOW_MS = 60_000;          // 1分以内に繰り返し発火しない

export async function initLiff() {
  const id = import.meta.env.VITE_LIFF_ID;
  if (!id) throw new Error('VITE_LIFF_ID is missing');
  await liff.init({ liffId: id });
}

export function isLoggedIn() {
  return liff.isLoggedIn();
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

function isTokenValidEnough(token: string | null, minMsLeft = 60_000): boolean {
  if (!token) return false;
  const p = decodeJwtPayload(token);
  if (!p?.exp) return false;
  const left = p.exp * 1000 - Date.now();
  return left > minMsLeft; // 残りが閾値より多ければOK
}

/** このページで最近 login() を実行していないか判定 */
function loginRecentlyTried(): boolean {
  const s = sessionStorage.getItem(LOGIN_FLAG_KEY);
  if (!s) return false;
  const t = Number(s);
  return Number.isFinite(t) && Date.now() - t < LOGIN_FLAG_WINDOW_MS;
}

/** このページで login() を1回だけ実行する */
async function loginOnce(redirectUri?: string) {
  if (loginRecentlyTried()) {
    throw new Error('Login already attempted recently. Avoiding loop.');
  }
  sessionStorage.setItem(LOGIN_FLAG_KEY, String(Date.now()));
  await liff.login(redirectUri ? { redirectUri } : undefined);
  // ここで通常はリダイレクトされる。戻ってきたら再度init後に処理を続行
}

/**
 * サイレントにトークンを確保する。
 * - 未ログイン: 1回だけ login リダイレクトを実行
 * - ログイン済 & トークン有効: そのまま返す
 * - ログイン済 & トークン失効: 1回だけ login リダイレクトを実行
 * どちらの場合も「直近で login を試している」なら例外を投げてループを止める
 */
export async function ensureFreshIdToken(minMsLeft = 60_000): Promise<string> {
  const token = getIDToken();
  if (isLoggedIn() && isTokenValidEnough(token, minMsLeft)) {
    return token!; // 充分に有効
  }

  // ここに来たら「未ログイン」または「トークン期限切れ/間近」
  // 同じURLに戻す（キャッシュ回避でクエリを付与）
  const redir = location.origin + location.pathname + location.search + (location.search ? '&' : '?') + 't=' + Date.now();
  await loginOnce(redir);

  // ここには通常戻ってこないが、戻ってきたときのために再取得
  const t2 = getIDToken();
  if (!isTokenValidEnough(t2, minMsLeft)) {
    throw new Error('Failed to obtain a fresh ID token');
  }
  return t2!;
}

/** 明示的にセッションを捨てて取り直す（ボタン用）*/
export async function forceReLogin(): Promise<string> {
  if (liff.isLoggedIn()) liff.logout();
  sessionStorage.removeItem(LOGIN_FLAG_KEY);
  const redir = location.origin + location.pathname + '?t=' + Date.now();
  await loginOnce(redir);
  const t = getIDToken();
  if (!isTokenValidEnough(t)) throw new Error('No fresh ID token after force login');
  return t!;
}

export function logoutAndReload() {
  if (liff.isLoggedIn()) {
    liff.logout();
  }
  sessionStorage.removeItem(LOGIN_FLAG_KEY);
  location.reload();
}