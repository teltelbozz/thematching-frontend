// src/App.tsx
import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { initLiff, whenAuthReady } from './liff';
import { getAccessToken } from './api';
import ProfileSetup from './screens/Profile';
import Home from './screens/Home';
import Flow from './screens/Flow';
import About from './screens/About';
import Faq from './screens/Faq';


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
      await whenAuthReady(); // ← ログイン完了（サーバーの /auth/login まで終了）を待つ

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

        navigate(j?.hasProfile ? '/' : '/profile', { replace: true });
      } catch (e) {
        // 失敗してもループはしない。とりあえずプロフィールへ誘導。
        console.warn('[boot] getProfile failed, go /profile', e);
        navigate('/profile', { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/profile" element={<ProfileSetup />} />
      <Route path="*" element={<Home />} />
      <Route path="/flow" element={<Flow />} />
      <Route path="/about" element={<About />} />
      <Route path="/faq" element={<Faq />} />
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