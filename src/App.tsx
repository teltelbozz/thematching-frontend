// src/App.tsx
import { useEffect, useRef } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from 'react-router-dom';
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
import Setup from './screens/Setup';

// ---- 起動・認証・ディープリンク処理をまとめて担当 ----
function BootRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const routedOnce = useRef(false);

  // 1) LIFF 初期化（1回だけ）
  useEffect(() => {
    initLiff().catch((e) => {
      console.error('[boot] initLiff error', e);
      // 起動エラーでもホームは見せる
      navigate('/', { replace: true });
    });
  }, [navigate]);

  // 2) 認証完了待ち → /me でプロフィール有無 → ?r=/xxx を考慮して遷移
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await whenAuthReady(); // /auth/login 完了まで待機

      if (cancelled || routedOnce.current) return;
      routedOnce.current = true;

      try {
        const token = getAccessToken();
        if (!token) {
          // 通常は whenAuthReady 後は入っている想定だが保険
          navigate('/profile', { replace: true });
          return;
        }

        const base = import.meta.env.VITE_API_BASE_URL as string; // 例: https://backend.xxx/api
        const res = await fetch(`${base}/me`, {
          method: 'GET',
          credentials: 'include',
          headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) throw new Error(`/me failed: ${res.status}`);
        const j = await res.json(); // { userId, hasProfile }

        // 例: https://.../?r=%2Fsolo
        const params = new URLSearchParams(location.search);
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
        console.warn('[boot] me check failed, go /profile', e);
        navigate('/profile', { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, location.search]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* 起動時の副作用（LIFF init / 認証完了待ち / deep link 遷移） */}
      <BootRouter />

      {/* 画面定義 */}
      <Routes>
        <Route path="/" element={<Home />} />

        {/* プロフィール登録フロー */}
        <Route path="/profile" element={<ProfileSetup />} />

        {/* マイページとその配下 */}
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/mypage/preferences" element={<MatchPrefs />} />
        <Route path="/mypage/faq" element={<Faq />} />
        <Route path="/mypage/invite" element={<Invite />} />
        <Route path="/mypage/account" element={<Account />} />

        {/* リッチメニュー A/B 導線 */}
        <Route path="/solo" element={<Setup defaultMode="solo" />} />
        <Route path="/friends" element={<Setup defaultMode="friends" />} />

        {/* 既存導線の互換 */}
        <Route path="/setup" element={<Setup />} />

        {/* フォールバック */}
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}