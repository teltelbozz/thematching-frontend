import liff from '@line/liff';

export async function initLiff() {
  const liffId = import.meta.env.VITE_LIFF_ID;
  if (!liffId) throw new Error('VITE_LIFF_ID is missing');
  await liff.init({ liffId });
}

export function isLoggedIn() {
  return liff.isLoggedIn();
}

export async function login() {
  if (!liff.isLoggedIn()) {
    await liff.login({ scope: ['openid', 'profile'] }); // openid が必須
  }
}

export function logout() {
  if (liff.isLoggedIn()) {
    liff.logout();
    window.location.reload();
  }
}

export function getIDToken(): string | null {
  return liff.getIDToken();
}

export async function getProfile() {
  if (!liff.isLoggedIn()) return null;
  return await liff.getProfile();
}