// src/api.ts
let ACCESS_TOKEN: string | null = null;

export function setAccessToken(t: string) {
  ACCESS_TOKEN = t;
}

export function getAccessToken() {
  return ACCESS_TOKEN;
}

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.VITE_API_BASE as string);

if (!API_BASE) console.warn('[api] VITE_API_BASE_URL is not set');

function base(path: string) {
  return API_BASE.replace(/\/+$/, '') + path;
}

async function doFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body)
    headers.set('Content-Type', 'application/json');
  if (ACCESS_TOKEN) headers.set('Authorization', 'Bearer ' + ACCESS_TOKEN);
  return fetch(base(path), { credentials: 'include', ...init, headers });
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  let r = await doFetch(path, init);
  if (r.status !== 401) return r;

  // 401 → refresh 試行
  const rr = await doFetch('/auth/refresh', { method: 'POST' });
  if (rr.ok) {
    const j = await rr.json().catch(() => ({}));
    const at = j?.accessToken ?? j?.access_token;
    if (at) setAccessToken(at);
    // retry
    r = await doFetch(path, init);
  }
  return r;
}

export async function apiGetJson<T = any>(path: string): Promise<T> {
  const r = await apiFetch(path);
  if (!r.ok) throw new Error(`${path} failed: ${r.status}`);
  return r.json();
}

export async function apiPutJson<T = any>(path: string, body: any): Promise<T> {
  const r = await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path} failed: ${r.status}`);
  return r.json();
}

// domain helpers
export const getProfile = () => apiGetJson('/profile');
export const saveProfile = (input: any) => apiPutJson('/profile', input);
export const getSetup = () => apiGetJson('/setup');
export const saveSetup = (input: any) => apiPutJson('/setup', input);

/**
 * ログイン直後（LIFFからIDトークンを受け取ったとき）に使う専用ヘルパ
 * - /auth/login に id_token を POST
 * - accessToken をレスポンスから抽出してセット
 */
export async function serverLoginWithIdToken(idToken: string): Promise<string> {
  const r = await doFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`login_failed:${r.status}:${t}`);
  }

  const j = await r.json().catch(() => ({}));
  const at = j?.accessToken ?? j?.access_token;
  if (!at) throw new Error('no_access_token_from_server');

  setAccessToken(at);
  return at; // ← これを返すように変更
}