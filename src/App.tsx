import { useEffect, useState } from 'react';
import {
  initLiff, ensureFreshIdToken, forceReLogin, logoutAndReload, maybeLoginOnce,
} from './liff';
import {
  authLoginWithIdToken, authMe, authLogout,
  getProfile, updateProfile, verifyAgeDummy, setupPaymentDummy,
} from './api';

type Profile = {
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
  const [me, setMe]   = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [err, setErr] = useState<string>();

  // フォーム用のローカル状態
  const [nick, setNick] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');

  useEffect(() => {
    (async () => {
      try {
        await initLiff();
        setBoot('ready');

        await maybeLoginOnce(async () => {
          const idToken = await ensureFreshIdToken(60_000);
          console.log('[liff] idToken present?', !!idToken, 'len=', idToken?.length);
          await authLoginWithIdToken(idToken);
          const m = await authMe();
          setMe(m.user);

          const p = await getProfile();
          setProfile(p.profile || null);
          if (p.profile?.nickname) setNick(p.profile.nickname);
          if (typeof p.profile?.age === 'number') setAge(p.profile.age);
          if (p.profile?.gender) setGender(p.profile.gender);
          if (p.profile?.occupation) setOccupation(p.profile.occupation);
        });
      } catch (e: any) {
        console.error(e);
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  const handleForce = async () => {
    try {
      setErr(undefined);
      await forceReLogin(); // 実際には戻らない想定
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  const handleLogout = async () => {
    try {
      await authLogout();
    } finally {
      logoutAndReload();
    }
  };

  const saveProfile = async () => {
    setErr(undefined);
    try {
      const res = await updateProfile({
        nickname: nick || undefined,
        age: typeof age === 'number' ? age : undefined,
        gender: gender || undefined,
        occupation: occupation || undefined,
      });
      setProfile(res.profile);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  const doVerifyAge = async () => {
    setErr(undefined);
    try {
      const r = await verifyAgeDummy();
      console.log('[verifyAge]', r);
      const p = await getProfile();
      setProfile(p.profile || null);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  const doSetupPayment = async () => {
    setErr(undefined);
    try {
      const r = await setupPaymentDummy('visa', '4242');
      console.log('[setupPayment]', r);
      const m = await authMe();         // users.payment_method_set は /me にも出る運用でもOK
      setMe(m.user);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' }}>
      <h1>thematching LIFF</h1>
      <div>status: {boot}</div>

      {err && (
        <div style={{ color: 'crimson', marginTop: 8 }}>
          <div><b>Login failed:</b> {err}</div>
          <button style={{ marginTop: 8 }} onClick={handleForce}>
            Force Re-Login
          </button>
        </div>
      )}

      {me ? (
        <>
          <div style={{ marginTop: 12, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
            <div><b>Logged in</b></div>
            <div>uid: {me.id}</div>
            <div>line_user_id: {me.line_user_id}</div>
            <div>payment_method_set: {String(me.payment_method_set)}</div>
            <button style={{ marginTop: 8 }} onClick={handleLogout}>Logout</button>
          </div>

          <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
            <div><b>Profile</b></div>
            <div>verified_age: {String(profile?.verified_age)}</div>
            <div style={{ marginTop: 8, display: 'grid', gap: 8, maxWidth: 360 }}>
              <label>Nickname
                <input style={{ width: '100%' }} value={nick} onChange={e => setNick(e.target.value)} />
              </label>
              <label>Age
                <input style={{ width: '100%' }} inputMode="numeric"
                       value={age} onChange={e => setAge(e.target.value ? Number(e.target.value) : '')} />
              </label>
              <label>Gender
                <input style={{ width: '100%' }} value={gender} onChange={e => setGender(e.target.value)} />
              </label>
              <label>Occupation
                <input style={{ width: '100%' }} value={occupation} onChange={e => setOccupation(e.target.value)} />
              </label>
              <button onClick={saveProfile}>Save Profile</button>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={doVerifyAge}>Verify Age (Dummy)</button>
              <button onClick={doSetupPayment}>Setup Payment (Dummy)</button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}