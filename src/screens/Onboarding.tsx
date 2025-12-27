// src/screens/Onboarding.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, getTermsStatus } from '../api';
import { closeLiffWindowSafe } from '../liff';

type LoadState = 'loading' | 'ready' | 'error';

export default function Onboarding() {
  const nav = useNavigate();
  const [state, setState] = useState<LoadState>('loading');
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setState('loading');
        setErr('');

        // 1) terms同意チェック（未同意なら terms → 同意後 profile(close)へ）
        const ts = await getTermsStatus().catch(() => ({ ok: true, accepted: true }));
        if (cancelled) return;

        if (!ts?.accepted) {
          // 同意後に /profile?done=close に行って保存したら閉じる
          nav(`/terms?r=${encodeURIComponent('/profile?done=close')}`, { replace: true });
          return;
        }

        // 2) プロフィール有無チェック
        const me = await getMe();
        if (cancelled) return;

        if (!me?.hasProfile) {
          // 未登録 → プロフィール入力へ（保存後 close）
          nav('/profile?done=close', { replace: true });
          return;
        }

        // 3) 登録済み → 即 close（公式アカウントのトークへ戻る）
        const closed = closeLiffWindowSafe();
        if (!closed) {
          // ブラウザ等で閉じられない場合のフォールバック
          nav('/', { replace: true });
        }
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message || String(e));
        setState('error');
      } finally {
        if (!cancelled) setState('ready');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nav]);

  if (state === 'loading') {
    return <div className="p-6 text-gray-600">起動中…</div>;
  }

  if (state === 'error') {
    return (
      <div className="p-6">
        <div className="text-red-600 font-semibold">Onboarding error</div>
        <pre className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{err}</pre>
      </div>
    );
  }

  // 基本ここは一瞬で遷移/closeされる想定
  return <div className="p-6 text-gray-600">準備中…</div>;
}