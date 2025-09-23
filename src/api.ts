const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || 'https://thematching-backend.vercel.app/api';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function refreshAccess(): Promise<boolean> {
  // リフレッシュは Cookie 依存なので include が必須
  const resp = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!resp.ok) return false;
  const data = await resp.json().catch(() => ({}));
  if (data?.access_token) {
    setAccessToken(data.access_token);
    console.log('[api] refreshed access token');
    return true;
  }
  return false;
}

/**
 * 共通フェッチ
 * - Bearer を自動付与
 * - 401 → refresh → 1回だけリトライ
 * - GET には Content-Type を付けない（プリフライト最小化）
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const resp = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    // 通常の API は Cookie 不要。refresh/login は個別関数側で include 済み。
  });

  if (resp.status === 401 && retry) {
    const ok = await refreshAccess();
    if (ok) return apiFetch(path, init, false);
  }
  return resp;
}

/**
 * ログイン：id_token → access_token(JSON) + refresh Cookie(HttpOnly)
 */
export async function authLoginWithIdToken(idToken: string) {
  console.log('[api] POST', `${API_BASE}/auth/login`);
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // ← refresh Cookie を受け取る
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!resp.ok) throw new Error(`login failed: ${resp.status}`);
  const data = await resp.json();
  if (data?.access_token) {
    setAccessToken(data.access_token);
    console.log('[api] got access token');
  } else {
    console.warn('[api] no access token in login response');
  }
  return data;
}

export async function authMe() {
  const resp = await apiFetch('/auth/me');
  if (!resp.ok) throw new Error(`me failed: ${resp.status}`);
  return resp.json();
}

export async function authLogout() {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include', // refresh Cookie を破棄
  });
  setAccessToken(null);
}