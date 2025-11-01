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

// API_BASE に末尾スラッシュがあっても安全に結合
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

/* ===================== Domain Types ===================== */

export type CandidateSlot = { date: string; time: '19:00'|'21:00' };

export type SetupDTO = {
  type_mode: 'wine_talk' | 'wine_and_others';
  candidate_slots: CandidateSlot[];
  location: 'shibuya_shinjuku';
  venue_pref?: null; // v2.6 初期は固定
  cost_pref: 'men_pay_all' | 'split_even' | 'follow_partner';
};

/* ===================== Domain APIs ===================== */

// me / profile
export const getProfile = () => apiGetJson('/profile');
export const saveProfile = (input: any) => apiPutJson('/profile', input);
export const getMe = () => apiGetJson('/me'); // 便利ヘルパ（性別などの取得に）

// setup（型を付ける）
export const getSetup = () => apiGetJson<{ setup: SetupDTO | null }>('/setup');
export const saveSetup = (input: SetupDTO) => apiPutJson<{ setup: SetupDTO }>('/setup', input);

// match-prefs（401時のrefreshを効かせるように統一）
export const getMatchPrefs = () => apiGetJson('/match-prefs');            // -> { prefs: {...} }
export const saveMatchPrefs = (payload: any) => apiPutJson('/match-prefs', payload);

/* ===================== Auth ===================== */
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
    // note: ここでは throw で十分。呼び出し元で UI エラー表示してください
  }

  const j = await r.json().catch(() => ({}));
  const at = j?.accessToken ?? j?.access_token;
  if (!at) throw new Error('no_access_token_from_server');

  setAccessToken(at);
  return at;
}