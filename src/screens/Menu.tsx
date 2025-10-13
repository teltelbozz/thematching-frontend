// src/screens/Menu.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { whenAuthReady } from '../liff';
import { getProfile } from '../api';

export default function Menu() {
  const [loaded, setLoaded] = useState(false);
  const [displayName, setDisplayName] = useState<string>('ユーザー');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await whenAuthReady();
        // メニューで軽く表示名だけ出す（失敗しても致命扱いにしない）
        const p: any = await getProfile().catch(() => ({}));
        setDisplayName(p?.profile?.displayName ?? 'ユーザー');
      } catch (e: any) {
        setError(e?.message ?? '読み込みに失敗しました');
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  return (
    <div style={page}>
      <h1 style={title}>メニュー</h1>
      {!loaded && <p>読み込み中...</p>}
      {error && <p style={errorBox}>{error}</p>}
      <p style={{ color:'#334155', marginBottom: 16 }}>ようこそ、{displayName} さん</p>

      <nav style={{ display:'grid', gap:12 }}>
        <Link to="/profile" style={btnStyle}>プロフィールを編集</Link>
        <Link to="/setup" style={btnStyle}>合コンの希望を設定</Link>
        <Link to="/mypage" style={ghostBtn}>マイページへ</Link>
      </nav>
    </div>
  );
}

const page: React.CSSProperties = { padding:16, maxWidth:560, margin:'0 auto' };
const title: React.CSSProperties = { fontSize:22, fontWeight:800, margin:'0 0 16px' };
const btnStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 16px',
  borderRadius: 12,
  textDecoration: 'none',
  background: '#0ea5e9',
  color: 'white',
  textAlign: 'center',
  fontWeight: 700,
};
const ghostBtn: React.CSSProperties = { ...btnStyle, background:'#f1f5f9', color:'#0f172a' };
const errorBox: React.CSSProperties = { background:'#fee2e2', color:'#991b1b', padding:'8px 12px', borderRadius:8, marginBottom:12, fontSize:14 };