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
        // 任意：メニューで軽くプロフィール名だけ表示（失敗しても致命的にしない）
        try {
          const p = await getProfile().catch(() => null);
          if (p?.profile?.displayName) setDisplayName(p.profile.displayName);
        } catch {}
        setLoaded(true);
      } catch (e: any) {
        console.error('[Menu] init failed', e);
        setError(e?.message ?? 'initialize_failed');
      }
    })();
  }, []);

  if (error) return <div style={{ padding: 16, color: 'red' }}>エラー: {error}</div>;
  if (!loaded) return <div style={{ padding: 16 }}>読み込み中...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>メニュー</h2>
      <div style={{ marginBottom: 16 }}>こんにちは、{displayName} さん</div>
      <nav style={{ display: 'grid', gap: 12 }}>
        <Link to="/profile" style={btnStyle}>プロフィールを編集</Link>
        <Link to="/setup" style={btnStyle}>合コンの設定</Link>
      </nav>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 16px',
  borderRadius: 12,
  textDecoration: 'none',
  background: '#0ea5e9',
  color: 'white',
  textAlign: 'center',
  fontWeight: 600
};