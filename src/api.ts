// src/api.ts — 修正版（全量差し替え）
let ACCESS_TOKEN: string | null = null;
let IS_REFRESHING = false;

export function setAccessToken(t: string | null) {
  ACCESS_TOKEN = t;
}
export function getAccessToken() {
  return ACCESS_TOKEN;
}

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.VITE_API_BASE as string);

function ensureApiBase() {
  if (!API_BASE) throw new Error('missing VITE_API_BASE_URL (or VITE_API_BASE)');
  return API_BASE.replace(/\/+$/, '');
}
function base(path: string) {
  return ensureApiBase() + path;
}

/** 401 のとき 1 回だけ /auth/refresh → 元リクエスト再試行 */
async function fetchWithAutoRefresh(
  input: RequestInfo | URL,
  init: RequestInit,
  once = false
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401 || once) return res;

  if (IS_REFRESHING) return res; // 二重リフレッシュ防止
  IS_REFRESHING = true;
  try {
    const r = await fetch(base('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (r.ok) {
      const data = (await r.json()) as { accessToken?: string };
      if (data?.accessToken) setAccessToken(data.accessToken);

      // 元リクエストを 1 回だけ再試行
      const headers = new Headers(init.headers || {});
      if (ACCESS_TOKEN) headers.set('Authorization', 'Bearer ' + ACCESS_TOKEN);
      return fetch(input, { ...init, headers });
    }
    return res;
  } finally {
    IS_REFRESHING = false;
  }
}

/** 共通 fetch */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (ACCESS_TOKEN) headers.set('Authorization', 'Bearer ' + ACCESS_TOKEN);

  const req: RequestInit = { credentials: 'include', ...init, headers };
  const url = base(path);
  return fetchWithAutoRefresh(url, req, false);
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

/** ---------- 認証ユーティリティ（LIFF 連携） ---------- */
/**
 * liff.getIDToken() で id_token を取得し、/auth/login に送る。
 * 成功: accessToken を保持。失敗: 例外。
 */
export async function loginWithLINE(liff: any) {
  if (!liff.isLoggedIn()) {
    liff.login(); // ここで遷移
    return;
  }
  const idToken = liff.getIDToken();
  if (!idToken) throw new Error('no id_token');

  const resp = await fetch(base('/auth/login'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!resp.ok) throw new Error(`login failed: ${resp.status}`);
  const data = (await resp.json()) as { accessToken?: string };
  if (!data?.accessToken) throw new Error('login succeeded but no accessToken');
  setAccessToken(data.accessToken);
  return data;
}

/** 明示ログアウト（サーバの refresh-cookie も破棄） */
export async function logout() {
  try {
    await fetch(base('/auth/logout'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    setAccessToken(null);
  }
}

/** ---------- ドメイン API ---------- */
export const getPrefs = () => apiGetJson('/prefs');
export const savePrefs = (input: any) => apiPutJson('/prefs', input);
export const getSetup = () => apiGetJson('/setup');
export const saveSetup = (input: any) => apiPutJson('/setup', input);
export const getProfile = () => apiGetJson('/profile');
export const saveProfile = (input: any) => apiPutJson('/profile', input);