// src/App.tsx
import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { initLiff, whenAuthReady } from './liff';
import { getProfile } from './api';
import ProfileSetup from './screens/Profile';
import Home from './screens/Home';

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
        // プロフィール取得
        const r = await getProfile(); // { profile: {...} } を想定
        const p = r?.profile || {};
        // 「未登録判定」：ニックネームが空なら登録画面へ
        const isRegistered = !!p.nickname;
        navigate(isRegistered ? '/' : '/profile', { replace: true });
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