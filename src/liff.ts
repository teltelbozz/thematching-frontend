import liff from '@line/liff';
import { setAccessToken } from './api';

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string;
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || (import.meta.env.VITE_API_BASE as string);

let _resolveAuthReady: (()=>void) | null = null;
const authReady = new Promise<void>((r)=>{ _resolveAuthReady = r; });
export function whenAuthReady(){ return authReady; }

export async function forceReLogin(){
  try { liff.logout(); } catch {}
  await liff.login({ redirectUri: location.href });
}

async function getIdTokenEnsured(): Promise<string>{
  let idt = liff.getIDToken();
  if (!idt) {
    console.log('[liff] no idToken -> login');
    await liff.login({ redirectUri: location.href });
    idt = liff.getIDToken();
  }
  if (!idt) throw new Error('failed_to_get_id_token');
  return idt;
}

async function serverLogin(idToken: string){
  if (!API_BASE) throw new Error('missing VITE_API_BASE_URL (or VITE_API_BASE)');
  const url = API_BASE.replace(/\/+$/, '') + '/auth/login';
  console.log('[api] POST', url);
  const r = await fetch(url, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    credentials:'include',
    body: JSON.stringify({ id_token: idToken })
  });
  if (!r.ok) {
    const t = await r.text().catch(()=>'');
    console.error('[api] login failed:', r.status, t);
    throw new Error(`login_failed:${r.status}`);
  }
  const json = await r.json().catch(()=>({}));
  const at = json?.access_token as string | undefined;
  if (!at) throw new Error('no_access_token_from_server');
  setAccessToken(at);
  console.log('[api] got access token');
}

export async function initLiff(){
  if (!LIFF_ID) throw new Error('missing VITE_LIFF_ID');
  await liff.init({ liffId: LIFF_ID });
  await liff.ready;

  if (!liff.isLoggedIn?.()) {
    console.log('[liff] not logged in -> login');
    await liff.login({ redirectUri: location.href });
    return;
  }
  console.log('[liff] idToken present? ->', !!liff.getIDToken());
  const idt = await getIdTokenEnsured();
  await serverLogin(idt);
  _resolveAuthReady?.();
}
