// src/screens/Terms.tsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { acceptTerms, getCurrentTerms, getMe, getTermsStatus } from '../api';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

    return () => {
      cancelled = true;
    };
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
    lineHeight: 1.6,
    color: '#111',
  };

  // Markdown内の見た目を少し整える（h1/h2/段落/リスト）
  const mdComponents = {
    h1: (p: any) => <h1 style={{ fontSize: 22, margin: '6px 0 12px' }} {...p} />,
    h2: (p: any) => <h2 style={{ fontSize: 18, margin: '18px 0 10px' }} {...p} />,
    h3: (p: any) => <h3 style={{ fontSize: 16, margin: '16px 0 8px' }} {...p} />,
    p: (p: any) => <p style={{ margin: '10px 0' }} {...p} />,
    ul: (p: any) => <ul style={{ margin: '10px 0', paddingLeft: 20 }} {...p} />,
    ol: (p: any) => <ol style={{ margin: '10px 0', paddingLeft: 20 }} {...p} />,
    li: (p: any) => <li style={{ margin: '6px 0' }} {...p} />,
    hr: (p: any) => <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '14px 0' }} {...p} />,
    blockquote: (p: any) => (
      <blockquote
        style={{
          margin: '12px 0',
          padding: '8px 10px',
          borderLeft: '4px solid #ddd',
          color: '#333',
          background: '#fafafa',
        }}
        {...p}
      />
    ),
  } as const;

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ margin: '8px 0 6px' }}>{title}</h2>
      <div style={{ color: '#666', fontSize: 12, marginBottom: 10 }}>
        {version ? (
          <>
            version: <b>{version}</b>　
          </>
        ) : null}
        {effectiveAt ? <>effective: {fmt(effectiveAt)}</> : null}
      </div>

      {state === 'loading' && <div style={{ color: '#666' }}>loading...</div>}

      {state === 'error' && (
        <div style={{ color: '#b00020' }}>terms load error: {err}</div>
      )}

      {state === 'ready' && (
        <>
          <div style={boxStyle}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents as any}>
              {body || '（利用規約本文が未設定です）'}
            </ReactMarkdown>
          </div>

          <div
            style={{
              marginTop: 12,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <span style={{ color: '#fbf7f7ff' }}>上記の利用規約に同意します</span>
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
                cursor: !checked || posting ? 'not-allowed' : 'pointer',
              }}
            >
              {posting ? 'Submitting...' : '同意して次へ'}
            </button>
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