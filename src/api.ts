let ACCESS_TOKEN: string | null = null;

export function setAccessToken(t: string){
  ACCESS_TOKEN = t;
}
export function getAccessToken(){ return ACCESS_TOKEN; }

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || (import.meta.env.VITE_API_BASE as string);

function base(path: string){
  return API_BASE.replace(/\/+$/, '') + path;
}

export async function apiFetch(path: string, init: RequestInit = {}){
  if (!API_BASE) throw new Error('missing VITE_API_BASE_URL (or VITE_API_BASE)');
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type','application/json');
  if (ACCESS_TOKEN) headers.set('Authorization', 'Bearer ' + ACCESS_TOKEN);
  const res = await fetch(base(path), { credentials:'include', ...init, headers });
  return res;
}

export async function apiGetJson<T=any>(path: string): Promise<T>{
  const r = await apiFetch(path);
  if (!r.ok) throw new Error(`${path} failed: ${r.status}`);
  return r.json();
}

export async function apiPutJson<T=any>(path: string, body: any): Promise<T>{
  const r = await apiFetch(path, { method:'PUT', body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path} failed: ${r.status}`);
  return r.json();
}

// domain specific helpers
export const getPrefs = () => apiGetJson('/prefs');
export const savePrefs = (input:any) => apiPutJson('/prefs', input);
export const getSetup = () => apiGetJson('/setup');
export const saveSetup = (input:any) => apiPutJson('/setup', input);
export const getProfile = () => apiGetJson('/profile');
export const saveProfile = (input:any) => apiPutJson('/profile', input);
