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
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
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

async function readErrorBody(r: Response) {
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const j = await r.json().catch(() => null);
    return j ? JSON.stringify(j) : '';
  }
  return r.text().catch(() => '');
}

export async function apiGetJson<T = any>(path: string): Promise<T> {
  const r = await apiFetch(path);
  if (!r.ok) {
    const t = await readErrorBody(r);
    throw new Error(`${path} failed: ${r.status}\n${t}`);
  }
  return r.json();
}
export async function apiPutJson<T = any>(path: string, body: any): Promise<T> {
  const r = await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
  if (!r.ok) {
    const t = await readErrorBody(r);
    throw new Error(`${path} failed: ${r.status}\n${t}`);
  }
  return r.json();
}
export async function apiPostJson<T = any>(path: string, body: any): Promise<T> {
  const r = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
  if (!r.ok) {
    const t = await readErrorBody(r);
    throw new Error(`${path} failed: ${r.status}\n${t}`);
  }
  return r.json();
}

/* ===================== Domain Types ===================== */

export type CandidateSlot = { date: string; time: '19:00' | '21:00' };

export type SetupDTO = {
  type_mode: 'wine_talk' | 'wine_and_others';
  candidate_slots: CandidateSlot[];
  location: 'shibuya_shinjuku';
  venue_pref?: null; // v2.6 初期は固定
  cost_pref: 'men_pay_all' | 'split_even' | 'follow_partner';
};

/** プロフィール入力（draft/confirm で共通利用） */
export type ProfileInput = {
  nickname?: string | null;
  age?: number | null;
  gender?: 'male' | 'female' | 'other' | string | null;
  occupation?: string | null;

  education?: string | null;
  university?: string | null;
  hometown?: string | null;
  residence?: string | null;

  personality?: string | null;
  income?: number | null;
  atmosphere?: string | null;

  // 写真URL（draftでは tempUrl を入れる想定）
  photo_url?: string | null;
  photo_masked_url?: string | null;
};

export type ProfileGetResponse = {
  profile: any; // 既存互換（必要なら後で型を固めます）
};

/** Draft状態の取得レスポンス（想定） */
export type ProfileDraft = {
  draft_id: number;
  // 入力内容
  nickname?: string | null;
  age?: number | null;
  gender?: string | null;
  occupation?: string | null;
  education?: string | null;
  university?: string | null;
  hometown?: string | null;
  residence?: string | null;
  personality?: string | null;
  income?: number | null;
  atmosphere?: string | null;

  // draft中の写真
  photo_url?: string | null; // temp blob url
  photo_pathname?: string | null; // vercel blob pathname

  created_at?: string;
  updated_at?: string;
};

export type ProfileDraftGetResponse =
  | { ok: true; draft: ProfileDraft | null }
  | { ok: true; draft: null };

export type ProfileDraftSaveResponse = { ok: true; draft: ProfileDraft };

export type ProfileConfirmResponse = {
  ok: true;
  profile: any;
};

export type ProfileCancelResponse = {
  ok: true;
  cancelled: true;
};

/* ===================== Domain APIs ===================== */

// me / profile
export const getProfile = () => apiGetJson<ProfileGetResponse>('/profile');
export const saveProfile = (input: any) => apiPutJson('/profile', input);
export const getMe = () => apiGetJson('/me');

// setup
export const getSetup = () => apiGetJson<{ setup: SetupDTO | null }>('/setup');
export const saveSetup = (input: SetupDTO) => apiPutJson<{ setup: SetupDTO }>('/setup', input);

// match-prefs
export const getMatchPrefs = () => apiGetJson('/match-prefs');
export const saveMatchPrefs = (payload: any) => apiPutJson('/match-prefs', payload);

/* ===================== Terms ===================== */
export type TermsDoc = {
  id: number;
  version: string;
  title: string;
  body_md: string;
  effective_at: string;
};

export type TermsCurrentResponse = { ok: true; terms: TermsDoc };
export type TermsStatusResponse = {
  ok: true;
  accepted: boolean;
  currentVersion?: string;
  acceptedVersion?: string | null;
};

export const getCurrentTerms = () => apiGetJson<TermsCurrentResponse>('/terms/current');
export const getTermsStatus = () => apiGetJson<TermsStatusResponse>('/terms/status');
export const acceptTerms = (payload?: { termsId?: number; version?: string; userAgent?: string }) =>
  apiPostJson('/terms/accept', payload ?? {});

/* ===================== Blob Upload ===================== */
export type BlobUploadResponse = {
  ok: true;
  url: string;
  pathname: string;
};

/**
 * 旧フロー互換：プロフィールが既に存在する前提で写真アップロード（A設計）。
 * 既存動作を壊さないため残してあります。
 */
export async function uploadProfilePhoto(file: File): Promise<BlobUploadResponse> {
  const fd = new FormData();
  fd.append('file', file);

  const r = await apiFetch('/blob/profile-photo', {
    method: 'POST',
    body: fd,
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`/blob/profile-photo failed: ${r.status}\n${t}`);
  }
  return r.json();
}

/**
 * 新フロー：Draft用の写真アップロード（DB確定は confirm で行う）
 * - backend: POST /api/blob/profile-photo-draft
 * - field: "file"
 */
export async function uploadProfileDraftPhoto(file: File): Promise<BlobUploadResponse> {
  const fd = new FormData();
  fd.append('file', file);

  const r = await apiFetch('/blob/profile-photo-draft', {
    method: 'POST',
    body: fd,
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`/blob/profile-photo-draft failed: ${r.status}\n${t}`);
  }
  return r.json();
}

/* ===================== Profile Draft Flow ===================== */
/**
 * Draft取得（無ければ null）
 */
export const getProfileDraft = () => apiGetJson<ProfileDraftGetResponse>('/profile/draft');

/**
 * Draft保存（仮保存）
 * - ①の「次へ（仮保存）」で叩く想定
 */
export const saveProfileDraft = (input: ProfileInput) =>
  apiPutJson<ProfileDraftSaveResponse>('/profile/draft', input);

/**
 * Confirm（確定）
 * - ③の確認画面でOK押下 → draft内容を user_profiles に反映 + temp blob を本採用
 */
export const confirmProfileDraft = () => apiPostJson<ProfileConfirmResponse>('/profile/confirm', {});

/**
 * Cancel（破棄）
 * - 途中離脱・キャンセル → draft + temp blob を破棄
 */
export const cancelProfileDraft = () => apiPostJson<ProfileCancelResponse>('/profile/cancel', {});

/* ===================== Auth ===================== */
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
  return at;
}

// groups
export type GroupPageResponse = {
  ok: true;
  group: {
    id: number;
    token: string;
    status: string;
    slot_dt: string;     // ISO
    slot_jst?: string;   // backendが返すなら
    location: string;
    type_mode: string;
    expires_at?: string; // backendが返すなら
  };
  members: Array<{
    user_id: number;
    gender: "male" | "female" | string;
    nickname: string | null;
    age: number | null;
    occupation: string | null;
    photo_url: string | null; // masked優先済みを受け取る想定
  }>;
};

export const getGroupByToken = (token: string) =>
  apiGetJson<GroupPageResponse>(`/groups/${encodeURIComponent(token)}`);