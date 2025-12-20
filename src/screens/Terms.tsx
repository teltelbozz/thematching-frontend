// src/screens/Terms.tsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { acceptTerms, getCurrentTerms, getMe, getTermsStatus } from '../api';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export default function Terms() {
  const nav = useNavigate();
  const loc = useLocation();

  const [state, setState] = useState<LoadState>('idle');
  const [err, setErr] = useState<string>('');

  const [title, setTitle] = useState<string>('利用規約');
  const [version, setVersion] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [effectiveAt, setEffectiveAt] = useState<string>('');

  const [acceptedAlready, setAcceptedAlready] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const [posting, setPosting] = useState<boolean>(false);

  const requestedPath = useMemo(() => {
    const params = new URLSearchParams(loc.search);
    const r = params.get('r');
    return r && r.startsWith('/') ? r : '/';
  }, [loc.search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState('loading');
      setErr('');

      try {
        // 1) status（すでに同意済みならスキップして戻す）
        const st = await getTermsStatus();
        if (cancelled) return;

        if (st?.accepted) {
          setAcceptedAlready(true);
          // すでに同意済みなら、Profile状態に応じて適切な場所へ
          const me = await getMe().catch(() => null);
          if (!me?.hasProfile) {
            nav('/profile', { replace: true });
          } else {
            nav(requestedPath, { replace: true });
          }
          return;
        }

        // 2) current terms 本文
        const cur = await getCurrentTerms();
        if (cancelled) return;

        setTitle(cur?.terms?.title ?? '利用規約');
        setVersion(cur?.terms?.version ?? '');
        setBody(cur?.terms?.body_md ?? '');
        setEffectiveAt(cur?.terms?.effective_at ?? '');
        setState('ready');
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message || String(e));
        setState('error');
      }
    })();

    return () => { cancelled = true; };
  }, [nav, requestedPath]);

  function fmt(iso: string) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('ja-JP');
    } catch {
      return iso;
    }
  }

  async function onAccept() {
    if (posting) return;
    if (!checked) {
      alert('利用規約を確認し、チェックを入れてください。');
      return;
    }

    setPosting(true);
    try {
      await acceptTerms({
        // termsId / version はバックエンド設計に合わせてどちらでも良いように“両対応”
        version: version || undefined,
        userAgent: navigator.userAgent,
      });

      // 同意後：プロフィール未設定なら /profile、設定済みなら r に戻す
      const me = await getMe().catch(() => null);
      if (!me?.hasProfile) {
        nav('/profile', { replace: true });
      } else {
        nav(requestedPath, { replace: true });
      }
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setPosting(false);
    }
  }

  const boxStyle: React.CSSProperties = {
    border: '1px solid #eee',
    borderRadius: 12,
    padding: 12,
    background: '#fff',
    height: '55vh',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
  };

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ margin: '8px 0 6px' }}>{title}</h2>
      <div style={{ color: '#666', fontSize: 12, marginBottom: 10 }}>
        {version ? <>version: <b>{version}</b>　</> : null}
        {effectiveAt ? <>effective: {fmt(effectiveAt)}</> : null}
      </div>

      {state === 'loading' && (
        <div style={{ color: '#666' }}>loading...</div>
      )}

      {state === 'error' && (
        <div style={{ color: '#b00020' }}>
          terms load error: {err}
        </div>
      )}

      {state === 'ready' && (
        <>
          <div style={boxStyle}>
            {body || '（利用規約本文が未設定です）'}
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <span>上記の利用規約に同意します</span>
            </label>

            <button
              onClick={onAccept}
              disabled={!checked || posting}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #0070f3',
                background: posting ? '#9cc5ff' : '#0070f3',
                color: '#fff',
                cursor: (!checked || posting) ? 'not-allowed' : 'pointer',
              }}
            >
              {posting ? 'Submitting...' : '同意して次へ'}
            </button>

            <span style={{ color: '#666', fontSize: 12 }}>
              ※ 同意が必要な場合のみ表示されます
            </span>
          </div>
        </>
      )}

      {/* 念のため（同意済みでここに残るケースは基本ない） */}
      {acceptedAlready && (
        <div style={{ marginTop: 12, color: '#067d17' }}>accepted</div>
      )}
    </div>
  );
}