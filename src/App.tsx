// src/App.tsx
import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { initLiff, whenAuthReady } from './liff';
import { getAccessToken } from './api';
import ProfileSetup from './screens/Profile';
import Home from './screens/Home';
import MyPage from './screens/MyPage';
import Preferences from './screens/Preferences';
import Faq from './screens/Faq';
import Invite from './screens/Invite';
import Account from './screens/Account';
import MatchPrefs from './screens/MatchPrefs';


function BootRouter() {
  const navigate = useNavigate();
  const routedOnce = useRef(false);

  useEffect(() => {
    // LIFF 初期化は一度だけ
    initLiff().catch((e) => {
      console.error('[boot] initLiff error', e);
      // 起動エラーでも一旦ホームは見せる
      navigate('/', { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await whenAuthReady(); // サーバーの /auth/login まで終了を待つ

      if (cancelled || routedOnce.current) return;
      routedOnce.current = true;

      try {
        // /api/me でプロフィール登録済みかを判定
        const token = getAccessToken();
        if (!token) {
          // 念のための保険（通常は whenAuthReady 済みなので入っている想定）
          navigate('/profile', { replace: true });
          return;
        }

        const base = import.meta.env.VITE_API_BASE_URL as string;
        const res = await fetch(`${base}/me`, {
          method: 'GET',
          credentials: 'include',
          headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) throw new Error(`/me failed: ${res.status}`);
        const j = await res.json(); // { userId, hasProfile }

        // "?r=/xxx" を拾う（例: https://.../?r=%2Fmypage）
        const params = new URLSearchParams(window.location.search);
        const requested = params.get('r');
        const requestedPath =
          requested && requested.startsWith('/') ? requested : '/';

        if (!j?.hasProfile) {
          navigate('/profile', { replace: true });
          return;
        }

        // 登録済みなら r があれば r へ、無ければホームへ
        navigate(requestedPath, { replace: true });
      } catch (e) {
        // 失敗してもループはしない。とりあえずプロフィールへ誘導。
        console.warn('[boot] me check failed, go /profile', e);
        navigate('/profile', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/profile" element={<ProfileSetup />} />
      <Route path="/mypage" element={<MyPage />} />
      <Route path="/mypage/preferences" element={<MatchPrefs />} />
      <Route path="/mypage/faq" element={<Faq />} />
      <Route path="/mypage/invite" element={<Invite />} />
      <Route path="/mypage/account" element={<Account />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <BootRouter />
    </BrowserRouter>
  );
}