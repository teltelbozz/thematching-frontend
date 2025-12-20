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
import Preferences from './screens/Preferences';
import Faq from './screens/Faq';
import Invite from './screens/Invite';
import Account from './screens/Account';
import MatchPrefs from './screens/MatchPrefs';
import Setup from './screens/Setup';
import GroupPage from './screens/GroupPage';
import Terms from './screens/Terms'; // ★ 追加

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

  // 2) 認証完了待ち → /me → terms status → 遷移
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

        // deep link: 例 https://.../?r=%2Fsolo
        const params = new URLSearchParams(location.search);
        const requested = params.get('r');
        const requestedPath =
          requested && requested.startsWith('/') ? requested : '/';

        // ① まず /me で登録状態を見る（既存仕様）
        const me = await getMe(); // { userId, hasProfile, gender? }

        // ② terms 同意状態チェック（★追加）
        //    未同意なら /terms に飛ばして、同意後に requestedPath へ戻す
        const ts = await getTermsStatus().catch((e) => {
          // terms API が未実装/一時不調でもアプリが死なないように「同意済み扱いで続行」
          console.warn('[boot] getTermsStatus failed (skip terms gating):', e);
          return { ok: true, accepted: true };
        });

        if (!ts?.accepted) {
          // Terms画面へ（同意後に戻る先を r で渡す）
          navigate(`/terms?r=${encodeURIComponent(requestedPath)}`, { replace: true });
          return;
        }

        // ③ プロフィール未完なら profile へ（既存仕様）
        if (!me?.hasProfile) {
          navigate('/profile', { replace: true });
          return;
        }

        // ④ 登録済みなら r があれば r へ、無ければホームへ
        navigate(requestedPath, { replace: true });
      } catch (e) {
        console.warn('[boot] boot check failed, go /profile', e);
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

        {/* ★ 利用規約同意（画面内表示） */}
        <Route path="/terms" element={<Terms />} />

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

        {/* グループページ */}
        <Route path="/group/:token" element={<GroupPage />} />

        {/* フォールバック */}
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}