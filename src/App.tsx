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

// ★新フロー
import ProfileDraft from './screens/ProfileDraft';
import ProfilePhoto from './screens/ProfilePhoto';
import ProfileConfirm from './screens/ProfileConfirm';

function BootRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const routedOnce = useRef(false);

  // ★ /g/:token は「完全共有型」なのでブートゲートをスキップ
  const isPublicGroupPage = location.pathname.startsWith('/g/');

  useEffect(() => {
    initLiff().catch((e) => {
      console.error('[boot] initLiff error', e);

      // ★ グループページは LIFF 失敗しても表示継続（完全共有型）
      if (isPublicGroupPage) return;

      navigate('/', { replace: true });
    });
  }, [navigate, isPublicGroupPage]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await whenAuthReady();

      if (cancelled || routedOnce.current) return;
      routedOnce.current = true;

      // ★ /g/:token はログイン不要なので、ここで何もしない（遷移もしない）
      if (isPublicGroupPage) return;

      // ★オンボーディング/規約/プロフィールフローは「画面側」で遷移制御する
      const p = location.pathname;
      if (
        p === '/onboarding' ||
        p === '/terms' ||
        p === '/profile' ||
        p === '/profile/photo' ||
        p === '/profile/confirm'
      ) {
        return;
      }

      try {
        const token = getAccessToken();
        if (!token) {
          navigate('/profile', { replace: true });
          return;
        }

        const params = new URLSearchParams(location.search);
        const requested = params.get('r');
        const requestedPath = requested && requested.startsWith('/') ? requested : '/';

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
  }, [navigate, location.pathname, location.search, isPublicGroupPage]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <BootRouter />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/terms" element={<Terms />} />

        {/* ★新プロフィール導線 */}
        <Route path="/profile" element={<ProfileDraft />} />
        <Route path="/profile/photo" element={<ProfilePhoto />} />
        <Route path="/profile/confirm" element={<ProfileConfirm />} />

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

        {/* グループページ（仕様：/g/:token） */}
        <Route path="/g/:token" element={<GroupPage />} />

        {/* 旧URL互換（必要なら残す） */}
        <Route path="/group/:token" element={<GroupPage />} />

        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}