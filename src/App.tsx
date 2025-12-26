// src/App.tsx
import { useEffect, useMemo, useRef } from 'react';
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
import Preferences from './screens/Preferences';
import Faq from './screens/Faq';
import Invite from './screens/Invite';
import Account from './screens/Account';
import MatchPrefs from './screens/MatchPrefs';
import Setup from './screens/Setup';
import GroupPage from './screens/GroupPage';
import Terms from './screens/Terms';

function BootRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const routedOnce = useRef(false);

  const { requestedPath, isOnboardingEntry } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const r = params.get('r');
    const rp = r && r.startsWith('/') ? r : '/';
    // r が無い = 公式チャンネルから “とりあえず開いた” ケースをオンボーディング扱い
    const onboarding = !r;
    return { requestedPath: rp, isOnboardingEntry: onboarding };
  }, [location.search]);

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

      try {
        const token = getAccessToken();
        if (!token) {
          // 念のため：トークンが取れないならプロフィールへ
          navigate('/profile', { replace: true });
          return;
        }

        const me = await getMe(); // { userId, hasProfile, ... }
        const ts = await getTermsStatus().catch((e) => {
          console.warn('[boot] getTermsStatus failed (skip terms gating):', e);
          return { ok: true, accepted: true };
        });

        // オンボーディング時の「完了後の行き先」
        const onboardingDonePath = '/profile?done=close';

        // ① 規約が未同意なら Terms へ
        if (!ts?.accepted) {
          const back =
            isOnboardingEntry
              ? onboardingDonePath
              : requestedPath; // deep link の時は戻す
          navigate(`/terms?r=${encodeURIComponent(back)}`, { replace: true });
          return;
        }

        // ② プロフィール未完なら profile へ
        if (!me?.hasProfile) {
          if (isOnboardingEntry) {
            navigate(onboardingDonePath, { replace: true });
          } else {
            // deep link の場合は、完了後に requestedPath へ戻せるよう r を渡す
            navigate(`/profile?r=${encodeURIComponent(requestedPath)}`, {
              replace: true,
            });
          }
          return;
        }

        // ③ 登録済み
        // - オンボーディング起点なら通常ホームへ（ここで閉じる挙動にはしない）
        // - deep link 起点なら requestedPath へ
        navigate(isOnboardingEntry ? '/' : requestedPath, { replace: true });
      } catch (e) {
        console.warn('[boot] boot check failed, go /profile', e);
        navigate('/profile', { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, requestedPath, isOnboardingEntry]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <BootRouter />

      <Routes>
        <Route path="/" element={<Home />} />

        {/* 利用規約同意 */}
        <Route path="/terms" element={<Terms />} />

        {/* プロフィール登録 */}
        <Route path="/profile" element={<ProfileSetup />} />

        {/* マイページ */}
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/mypage/preferences" element={<MatchPrefs />} />
        <Route path="/mypage/faq" element={<Faq />} />
        <Route path="/mypage/invite" element={<Invite />} />
        <Route path="/mypage/account" element={<Account />} />

        {/* リッチメニュー導線 */}
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