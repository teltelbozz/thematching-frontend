const API_BASE = import.meta.env.VITE_API_BASE || 'https://thematching.vercel.app/api';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function refreshAccess(): Promise<boolean> {
  const resp = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include', // ← RefreshはCookieに依存
  });
  if (!resp.ok) return false;
  const data = await resp.json();
  if (data?.access_token) {
    setAccessToken(data.access_token);
    return true;
  }
  return false;
}

export async function apiFetch(path: string, init: RequestInit = {}, retry = true) {
  const headers = new Headers(init.headers || {});
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json');

  const resp = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: init.credentials, // 通常は不要。refreshは別関数が行う
  });

  if (resp.status === 401 && retry) {
    // アクセス失効 → refreshして一度だけリトライ
    const ok = await refreshAccess();
    if (ok) return apiFetch(path, init, false);
  }
  return resp;
}

// ===== high-level helpers =====
export async function authLoginWithIdToken(idToken: string) {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // ← Set-Cookie(rt) を受け取るため必須
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!resp.ok) throw new Error(`login failed: ${resp.status}`);
  const data = await resp.json();
  if (data?.access_token) setAccessToken(data.access_token);
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
    credentials: 'include', // クッキー削除
  });
  setAccessToken(null);
}