const BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function authLoginWithIdToken(idToken: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Cookie利用
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  return await res.json();
}

export async function authMe() {
  const res = await fetch(`${BASE}/auth/me`, { credentials: 'include' });
  if (!res.ok) throw new Error(`me failed: ${res.status}`);
  return await res.json();
}