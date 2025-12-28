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
import { getAccessToken, getMe, getTermsStatus } from './api';

import ProfileSetup from './screens/Profile';
import Home from './screens/Home';
import MyPage from './screens/MyPage';
import Faq from './screens/Faq';
import Invite from './screens/Invite';
import Account from './screens/Account';
import MatchPrefs from './screens/MatchPrefs';
import Setup from './screens/Setup';
import GroupPage from './screens/GroupPage';
import Terms from './screens/Terms';
import Onboarding from './screens/Onboarding';

function BootRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const routedOnce = useRef(false);

  // 1) LIFF 初期化（1回だけ）
  useEffect(() => {
    initLiff().catch((e) => {
      console.error('[boot] initLiff error', e);
      navigate('/', { replace: true });
    });
  }, [navigate]);

  // 2) 認証完了待ち → /me → terms status → 遷移
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await whenAuthReady();

      if (cancelled || routedOnce.current) return;
      routedOnce.current = true;

      // ★オンボーディング/規約/プロフィール画面は「画面側」で遷移制御する
      const p = location.pathname;
      if (p === '/onboarding' || p === '/terms' || p === '/profile') return;

      try {
        const token = getAccessToken();
        if (!token) {
          navigate('/profile', { replace: true });
          return;
        }

        const params = new URLSearchParams(location.search);
        const requested = params.get('r');
        const requestedPath =
          requested && requested.startsWith('/') ? requested : '/';

        const me = await getMe();

        const ts = await getTermsStatus().catch((e) => {
          console.warn('[boot] getTermsStatus failed (skip terms gating):', e);
          return { ok: true, accepted: true };
        });

        if (!ts?.accepted) {
          navigate(`/terms?r=${encodeURIComponent(requestedPath)}`, { replace: true });
          return;
        }

        if (!me?.hasProfile) {
          navigate('/profile', { replace: true });
          return;
        }

        navigate(requestedPath, { replace: true });
      } catch (e) {
        console.warn('[boot] boot check failed, go /profile', e);
        navigate('/profile', { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, location.pathname, location.search]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <BootRouter />

      <Routes>
        <Route path="/" element={<Home />} />

        {/* ★ 新規：オンボーディング（リッチメニューのリンク先） */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* 利用規約同意 */}
        <Route path="/terms" element={<Terms />} />

        {/* プロフィール登録 */}
        <Route path="/profile" element={<ProfileSetup />} />

        {/* マイページとその配下 */}
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/mypage/preferences" element={<MatchPrefs />} />
        <Route path="/mypage/faq" element={<Faq />} />
        <Route path="/mypage/invite" element={<Invite />} />
        <Route path="/mypage/account" element={<Account />} />

        {/* リッチメニュー A/B 導線（互換は残す） */}
        <Route path="/solo" element={<Setup defaultMode="solo" />} />
        <Route path="/friends" element={<Setup defaultMode="friends" />} />
        <Route path="/setup" element={<Setup />} />

        {/* グループページ */}
        <Route path="/group/:token" element={<GroupPage />} />

        {/* フォールバック */}
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}