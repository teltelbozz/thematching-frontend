const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://thematching-backend.vercel.app/api';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function refreshAccess(): Promise<boolean> {
  const resp = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!resp.ok) return false;
  const data = await resp.json();
  if (data?.access_token) {
    setAccessToken(data.access_token);
    console.log('[api] refreshed access token');
    return true;
  }
  return false;
}

export async function apiFetch(path: string, init: RequestInit = {}, retry = true) {
  const headers = new Headers(init.headers || {});
  // Bearer は必要なときだけ
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  // ★ GET には Content-Type を付けない（プリフライト最小化）
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const resp = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    // 通常のAPI呼び出しは credentials 不要（refresh/login は個別に include）
  });

  if (resp.status === 401 && retry) {
    const ok = await refreshAccess();
    if (ok) return apiFetch(path, init, false);
  }
  return resp;
}

export async function authLoginWithIdToken(idToken: string) {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // refresh-cookie を受け取るため必須
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
    credentials: 'include', // クッキー削除
  });
  setAccessToken(null);
}