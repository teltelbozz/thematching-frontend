import { useEffect, useState } from 'react';
import { initLiff, ensureFreshIdToken, logout } from './liff';
import { authLoginWithIdToken, authMe } from './api';

export default function App() {
  const [boot, setBoot] = useState<'booting' | 'ready'>('booting');
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string>();

  useEffect(() => {
    (async () => {
      try {
        await initLiff();
        setBoot('ready');

        const idToken = await ensureFreshIdToken(60_000); // 残り1分未満なら更新
        await authLoginWithIdToken(idToken);              // Cookie発行
        const m = await authMe();
        setMe(m.user);
      } catch (e: any) {
        setErr(e?.message || String(e));
        console.error(e);
      }
    })();
  }, []);

  const retry = async () => {
    setErr(undefined);
    try {
      const idToken = await ensureFreshIdToken(60_000);
      await authLoginWithIdToken(idToken);
      const m = await authMe();
      setMe(m.user);
    } catch (e: any) {
      setErr(e?.message || String(e));
      console.error(e);
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' }}>
      <h1>thematching LIFF</h1>
      <div>status: {boot}</div>

      {err && (
        <div style={{ color: 'crimson', marginTop: 8 }}>
          <div><b>Login failed:</b> {err}</div>
          <button style={{ marginTop: 8 }} onClick={retry}>Re-Login & Retry</button>
        </div>
      )}

      {me ? (
        <div style={{ marginTop: 16 }}>
          <div>Logged in as: <b>{me.nickname || me.line_user_id}</b></div>
          <button style={{ marginTop: 12 }} onClick={logout}>Logout</button>
        </div>
      ) : null}
    </div>
  );
}