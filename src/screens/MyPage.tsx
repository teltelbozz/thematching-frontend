// src/screens/MyPage.tsx
import { useEffect, useState } from 'react';
import { whenAuthReady } from '../liff';
import { getProfile } from '../api';
import { Link } from 'react-router-dom';

export default function MyPage() {
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState<string>('ユーザー');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await whenAuthReady();
        const p: any = await getProfile().catch(() => ({}));
        setName(p?.profile?.displayName ?? 'ユーザー');
      } catch (e: any) {
        setErr(e?.message ?? '読み込みに失敗しました');
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  return (
    <div style={page}>
      <h1 style={title}>マイページ</h1>
      {!loaded && <p>読み込み中...</p>}
      {err && <p style={errorBox}>{err}</p>}
      <p style={{ color:'#334155', marginBottom: 16 }}>こんにちは、{name} さん</p>
      <div style={{ display:'grid', gap:12 }}>
        <Link to="/profile" style={btn}>プロフィールを編集</Link>
        <Link to="/setup" style={btn}>合コンの希望を設定</Link>
        <Link to="/menu" style={ghostBtn}>メニューに戻る</Link>
      </div>
    </div>
  );
}

const page: React.CSSProperties = { padding:16, maxWidth:560, margin:'0 auto' };
const title: React.CSSProperties = { fontSize:22, fontWeight:800, margin:'0 0 16px' };
const btn: React.CSSProperties = { display:'inline-block', padding:'12px 16px', borderRadius:12, background:'#0ea5e9', color:'#fff', textDecoration:'none', textAlign:'center', fontWeight:700 };
const ghostBtn: React.CSSProperties = { ...btn, background:'#f1f5f9', color:'#0f172a' };
const errorBox: React.CSSProperties = { background:'#fee2e2', color:'#991b1b', padding:'8px 12px', borderRadius:8, marginBottom:12, fontSize:14 };