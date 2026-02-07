// src/screens/Onboarding.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, getTermsStatus } from '../api';

type LoadState = 'loading' | 'error';

export default function Onboarding() {
  const nav = useNavigate();
  const [state, setState] = useState<LoadState>('loading');
  const [err, setErr] = useState('');
  const MATCH_PREFS_PATH = '/mypage/preferences';

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setState('loading');
        setErr('');

        // 1) terms同意チェック
        const ts = await getTermsStatus().catch(() => ({ ok: true, accepted: true }));
        if (cancelled) return;

        if (!ts?.accepted) {
          // 同意後はプロフィールへ進み、完了後に希望条件画面へ進む
          nav(`/terms?r=${encodeURIComponent(`/profile?r=${MATCH_PREFS_PATH}`)}`, { replace: true });
          return;
        }

        // 2) プロフィール有無チェック
        const me = await getMe();
        if (cancelled) return;

        if (!me?.hasProfile) {
          // 未登録 → プロフィール入力へ（完了後は希望条件画面）
          nav(`/profile?r=${encodeURIComponent(MATCH_PREFS_PATH)}`, { replace: true });
          return;
        }

        // 3) 登録済み → 希望条件画面へ
        nav(MATCH_PREFS_PATH, { replace: true });
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message || String(e));
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nav]);

  if (state === 'loading') return <div className="p-6 text-gray-600">起動中…</div>;

  return (
    <div className="p-6">
      <div className="text-red-600 font-semibold">Onboarding error</div>
      <pre className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{err}</pre>
    </div>
  );
}
