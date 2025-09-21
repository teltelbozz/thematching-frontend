import { useEffect, useState } from 'react';
import { initLiff, isLoggedIn, login, getFreshIDToken, decodeJwtPayload, logout } from './liff';
import { authLoginWithIdToken, authMe } from './api';

export default function App() {
  const [boot, setBoot] = useState<'booting' | 'ready'>('booting');
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string>();

  // 1) 起動時：LIFF初期化 → ログイン → 新しいid_tokenでサーバにログイン
  useEffect(() => {
    (async () => {
      try {
        await initLiff();
        setBoot('ready');

        // 未ログインならLINEログインへ
        if (!isLoggedIn()) {
          await login();
          return; // リダイレクトされ、戻ってきた後に再実行される
        }

        // 常に“今の”IDトークンを取得して送る
        const token = getFreshIDToken();
        if (!token) throw new Error('No ID token');

        // 参考：期限をログで見たい時
        const payload = decodeJwtPayload(token);
        if (payload?.exp) {
          const left = payload.exp * 1000 - Date.now();
          console.log('[LIFF] id_token exp in ms:', left);
        }

        // バックエンドへログイン（Cookie発行）
        await authLoginWithIdToken(token);

        // 自分情報取得
        const m = await authMe();
        setMe(m.user);
      } catch (e: any) {
        console.error(e);
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  // 2) 手動ログイン（ボタン）
  const handleLogin = async () => {
    setErr(undefined);
    try {
      await login(); // 未ログインならLINEへ遷移
      const token = getFreshIDToken();
      if (!token) throw new Error('No ID token');

      await authLoginWithIdToken(token);
      const m = await authMe();
      setMe(m.user);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  // 3) 401やexp失効に遭遇した時のリトライ
  const retryAfterRelogin = async () => {
    setErr(undefined);
    try {
      await login();
      const token = getFreshIDToken();
      if (!token) throw new Error('No ID token');
      await authLoginWithIdToken(token);
      const m = await authMe();
      setMe(m.user);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' }}>
      <h1>thematching LIFF</h1>
      <div>status: {boot}</div>
      {err && (
        <div style={{ color: 'crimson', marginTop: 8 }}>
          <div><b>Error:</b> {err}</div>
          <button onClick={retryAfterRelogin} style={{ marginTop: 8 }}>Re-Login & Retry</button>
        </div>
      )}

      {me ? (
        <div style={{ marginTop: 16 }}>
          <div>Logged in as: <b>{me.nickname || me.line_user_id}</b></div>
          <button style={{ marginTop: 12 }} onClick={logout}>Logout</button>
        </div>
      ) : (
        <button style={{ marginTop: 12 }} onClick={handleLogin}>Login with LINE</button>
      )}
    </div>
  );
}