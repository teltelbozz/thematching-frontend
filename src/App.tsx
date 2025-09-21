import React, { useEffect, useState } from 'react';
import { initLiff, login, logout, isLoggedIn, getIDToken, getProfile } from './liff';
import { authLoginWithIdToken, authMe } from './api';

function App() {
  const [me, setMe] = useState<any>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    (async () => {
      try {
        await initLiff();
        if (isLoggedIn()) {
          const token = getIDToken();
          if (token) {
            await authLoginWithIdToken(token);
            const user = await authMe();
            setMe(user.user);
          }
        }
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, []);

  const handleLogin = async () => {
    try {
      await login();
      const token = getIDToken();
      if (!token) throw new Error('No ID token');
      await authLoginWithIdToken(token);
      const user = await authMe();
      setMe(user.user);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>thematching LIFF Demo</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {me ? (
        <div>
          <p>Logged in as: {me.nickname || me.line_user_id}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login with LINE</button>
      )}
    </div>
  );
}

export default App;