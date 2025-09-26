// API ベースURL（Vercel の環境変数 VITE_API_BASE を使用）
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || 'https://thematching-backend.vercel.app/api';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// ── 共通：access 再発行（Cookieベース）
async function refreshAccess(): Promise<boolean> {
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

// ── 共通：フェッチ（401→refresh→1回だけ再試行）
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
  });
  if (resp.status === 401 && retry) {
    const ok = await refreshAccess();
    if (ok) return apiFetch(path, init, false);
  }
  return resp;
}

// ── 認証系
export async function authLoginWithIdToken(idToken: string) {
  console.log('[api] POST', `${API_BASE}/auth/login`);
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // refresh Cookie を受け取る
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!resp.ok) throw new Error(`login failed: ${resp.status}`);
  const data = await resp.json();
  if (data?.access_token) {
    setAccessToken(data.access_token);
    console.log('[api] got access token');
  }
  return data;
}
export async function authMe() {
  const r = await apiFetch('/auth/me');
  if (!r.ok) throw new Error(`me failed: ${r.status}`);
  return r.json();
}
export async function authLogout() {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  setAccessToken(null);
}

// ── プロフィール
export async function getProfile() {
  const r = await apiFetch('/profile');
  if (!r.ok) throw new Error(`profile get failed: ${r.status}`);
  return r.json();
}
export async function updateProfile(input: {
  nickname?: string; age?: number; gender?: string; occupation?: string;
  photo_url?: string; photo_masked_url?: string;
}) {
  const r = await apiFetch('/profile', { method: 'PUT', body: JSON.stringify(input) });
  if (!r.ok) throw new Error(`profile put failed: ${r.status}`);
  return r.json();
}

// ── 年齢確認（ダミー）
export async function verifyAgeDummy() {
  const r = await apiFetch('/verify/age', {
    method: 'POST',
    body: JSON.stringify({ method: 'upload_id' }), // 今は何でもOK
  });
  if (!r.ok) throw new Error(`verify age failed: ${r.status}`);
  return r.json();
}

// ── 決済登録（ダミー）
export async function setupPaymentDummy(brand?: string, last4?: string) {
  const r = await apiFetch('/payments/setup', {
    method: 'POST',
    body: JSON.stringify({ brand, last4 }),
  });
  if (!r.ok) throw new Error(`payment setup failed: ${r.status}`);
  return r.json();
}