import liff from '@line/liff';

export async function initLiff() {
  const id = import.meta.env.VITE_LIFF_ID;
  if (!id) throw new Error('VITE_LIFF_ID is missing');
  await liff.init({ liffId: id });
}

export function isLoggedIn() {
  return liff.isLoggedIn();
}

export async function ensureFreshIdToken(maxSkewMs = 60_000): Promise<string> {
  if (!liff.isLoggedIn()) {
    liff.login();
    await new Promise<never>(() => {});
  }

  const token = liff.getIDToken();
  const decoded = liff.getDecodedIDToken() as any | null;
  const nowSec = Math.floor(Date.now() / 1000);
  const isStale =
    !token || !decoded?.exp || decoded.exp - nowSec <= Math.ceil(maxSkewMs / 1000);

  if (isStale) {
    liff.login();
    await new Promise<never>(() => {});
  }

  const fresh = liff.getIDToken();
  if (!fresh) throw new Error('Failed to acquire LIFF id_token');
  return fresh;
}

/** ★ ここを修正：戻り型を Promise<never> に */
export async function forceReLogin(): Promise<void> {
  liff.login();
  await new Promise<never>(() => {}); // 実際には戻らない
}

export function logoutAndReload() {
  try {
    liff.logout();
  } finally {
    location.replace(location.href.split('#')[0]);
  }
}

/** ループ防止ヘルパ（省略せずそのまま） */
const API_BASE = import.meta.env.VITE_API_BASE || '';
const ATTEMPT_KEY = `login:lastAttempt:${API_BASE}`;
const COOLDOWN_MS = 8000;

export async function maybeLoginOnce<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const last = Number(localStorage.getItem(ATTEMPT_KEY) || '0');

  if (last && now - last < COOLDOWN_MS) {
    throw new Error('Login already attempted recently. Avoiding loop.');
  }

  localStorage.setItem(ATTEMPT_KEY, String(now));
  try {
    const r = await fn();
    localStorage.removeItem(ATTEMPT_KEY);
    return r;
  } catch (e) {
    setTimeout(() => localStorage.removeItem(ATTEMPT_KEY), COOLDOWN_MS);
    throw e;
  }
}