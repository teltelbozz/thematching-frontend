import { useEffect, useState } from 'react';
import {
  initLiff, ensureFreshIdToken, forceReLogin, logoutAndReload, maybeLoginOnce,
} from './liff';
import {
  authLoginWithIdToken, authMe, authLogout,
  getProfile, updateProfile, verifyAgeDummy, setupPaymentDummy,
} from './api';
import Setup from './Setup';
import ProfileForm from './ProfileForm';

// 型定義
export type Profile = {
  id?: number;
  line_user_id?: string;
  nickname?: string;
  age?: number;
  gender?: string;
  occupation?: string;
  photo_url?: string;
  photo_masked_url?: string;
  verified_age?: boolean;
  payment_method_set?: boolean;
};

export default function App() {
  const [boot, setBoot] = useState<'booting' | 'ready'>('booting');
  const [me, setMe] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 追加: プロフィール入力とSetup画面の状態
  const [showProfileForm, setShowProfileForm] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initLiff();
        await maybeLoginOnce();
        await ensureFreshIdToken();

        const me = await authMe();
        console.log('[authMe]', me);
        setMe(me);
        setBoot('ready');
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'login failed');
        setBoot('ready');
      }
    })();
  }, []);

  // プロフィールフォームの保存完了時
  if (showProfileForm) {
    return <ProfileForm onSaved={() => {
      setShowProfileForm(false);
      setShowSetup(true);
    }} />;
  }

  if (showSetup) {
    return <Setup />;
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1>thematching LIFF</h1>
      <div>status: {boot}</div>
      {error && <div style={{ color: 'red' }}>Login failed: {error}</div>}
      <button onClick={forceReLogin}>Force Re-Login</button>
      <button onClick={logoutAndReload}>Logout</button>
    </div>
  );
}