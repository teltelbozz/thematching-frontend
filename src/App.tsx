import { useEffect, useState } from 'react';
import { initLiff, ensureFreshIdToken, forceReLogin, logoutAndReload } from './liff';
import { authLoginWithIdToken, authMe, authLogout } from './api';

export default function App() {
  const [boot, setBoot] = useState<'booting'|'ready'>('booting');
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string>();

  useEffect(() => {
    (async () => {
      try {
        await initLiff();
        setBoot('ready');

        // 1) id_token を確保（必要なら1回だけリダイレクト）
        const idToken = await ensureFreshIdToken(60_000);
        console.log('[liff] idToken =', idToken);
        // 2) login → access_token(JSON) + refresh Cookie(HttpOnly)
        await authLoginWithIdToken(idToken);
        // 3) Bearer で /me
        const m = await authMe();
        setMe(m.user);
      } catch (e:any) {
        console.error(e);
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  const handleForce = async () => {
    try {
      setErr(undefined);
      const t = await forceReLogin();
      await authLoginWithIdToken(t);
      const m = await authMe();
      setMe(m.user);
    } catch (e:any) {
      setErr(e?.message || String(e));
    }
  };

  const handleLogout = async () => {
    await authLogout();
    logoutAndReload();
  };

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' }}>
      <h1>thematching LIFF</h1>
      <div>status: {boot}</div>

      {err && (
        <div style={{ color: 'crimson', marginTop: 8 }}>
          <div><b>Login failed:</b> {err}</div>
          <button style={{ marginTop: 8 }} onClick={handleForce}>Force Re-Login</button>
        </div>
      )}

      {me ? (
        <div style={{ marginTop: 16 }}>
          <div>Logged in as: <b>{me.nickname || me.line_user_id}</b></div>
          <button style={{ marginTop: 12 }} onClick={handleLogout}>Logout</button>
        </div>
      ) : null}
    </div>
  );
}