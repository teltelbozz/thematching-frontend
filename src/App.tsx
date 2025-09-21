import { useEffect, useState } from 'react';
import { initLiff, ensureFreshIdToken, forceReLogin, logoutAndReload } from './liff';
import { authLoginWithIdToken, authMe } from './api';

export default function App() {
  const [boot, setBoot] = useState<'booting'|'ready'>('booting');
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string>();

  useEffect(() => {
    (async () => {
      try {
        await initLiff();
        setBoot('ready');

        // サイレントにトークン確保（必要な場合のみ1回だけリダイレクト）
        const idToken = await ensureFreshIdToken(60_000);
        await authLoginWithIdToken(idToken); // Cookie発行
        const m = await authMe();
        setMe(m.user);
      } catch (e:any) {
        console.error(e);
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  const handleForce = async () => {
    setErr(undefined);
    try {
      const t = await forceReLogin();
      await authLoginWithIdToken(t);
      const m = await authMe();
      setMe(m.user);
    } catch (e:any) {
      setErr(e?.message || String(e));
    }
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
          <div style={{ marginTop: 12 }}>
            <button onClick={logoutAndReload}>Logout</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}