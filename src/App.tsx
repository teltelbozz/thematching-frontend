import { useEffect, useState } from 'react';
import { initLiff, ensureFreshIdToken, forceReLogin, logout } from './liff';
import { authLoginWithIdToken, authMe } from './api';

export default function App() {
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string>();

  useEffect(() => {
    (async () => {
      try {
        await initLiff();
        const token = await ensureFreshIdToken(60_000); // 残り1分未満なら更新
        await authLoginWithIdToken(token);
        const m = await authMe();
        setMe(m.user);
      } catch (e:any) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  const handleForce = async () => {
    try {
      setErr(undefined);
      const t = await forceReLogin();      // ★完全取り直し
      await authLoginWithIdToken(t);
      const m = await authMe();
      setMe(m.user);
    } catch (e:any) { setErr(e?.message || String(e)); }
  };

  return (
    <div style={{padding:16}}>
      <h1>thematching LIFF</h1>
      {err && <div style={{color:'crimson'}}>Login failed: {err}
        <div><button onClick={handleForce}>Force Re-Login</button></div>
      </div>}
      {me && <div>Logged in as: <b>{me.nickname || me.line_user_id}</b>
        <div><button onClick={logout}>Logout</button></div>
      </div>}
    </div>
  );
}