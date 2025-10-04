// src/App.tsx
import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Navigate,useLocation } from 'react-router-dom';
import { initLiff } from './liff';       // 既存: LIFF 初期化
import Menu from './screens/Menu';       // 新規: 6タイルのメニュー
import Setup from './Setup';             // 既存: 合コン設定（希望条件＋日付 保存→参加）
import './styles.css';                   // グローバルスタイル（The4風配色など）


/**
 * 画面未実装のプレースホルダ
 */
const Placeholder = ({ title }: { title: string }) => (
  <div className="safe">
    <h2 style={{ margin: '8px 0 12px' }}>{title}</h2>
    <p style={{ color: '#9aa0a6' }}>この画面は今後実装します。</p>
  </div>
);

/**
 * アプリのエントリ
 * - 起動時に LIFF を初期化
 * - 初期化が終わるまでローディング表示
 * - ルーティング：メニューをトップにし、各タイルへ遷移
 */
export default function App() {
  const nav = useNavigate();
  const [boot, setBoot] = useState<'booting' | 'ready' | 'error'>('booting');
  const [err, setErr] = useState<string>();

  const loc = useLocation();

  useEffect(() => {
    // 例: https://liff.line.me/LIFF_ID?r=%2Fsolo
    const sp = new URLSearchParams(loc.search);
    const r = sp.get('r');
    if (r && typeof r === 'string') {
      // 安全側: 先頭がスラッシュの相対パスのみ許可（外部ドメイン遷移はしない）
      if (r.startsWith('/')) nav(r, { replace: true });
    }
  }, []); // 初回のみ

  useEffect(() => {
    (async () => {
      try {
        await initLiff();
        setBoot('ready');
      } catch (e: any) {
        console.error('[App] liff init error:', e);
        setErr(e?.message || String(e));
        setBoot('error');
      }
    })();
  }, []);

  if (boot === 'booting') {
    return (
      <div className="safe" style={{ opacity: 0.85 }}>
        <div className="menu-title">読み込み中...</div>
        <div style={{ color: '#9aa0a6', fontSize: 12 }}>
          LINEログインと設定を準備しています
        </div>
      </div>
    );
  }

  if (boot === 'error') {
    return (
      <div className="safe">
        <div className="menu-title">起動エラー</div>
        <div style={{ color: '#e87d7d', marginBottom: 12 }}>{err}</div>
        <button className="tile" style={{ width: 180, height: 44 }} onClick={() => location.reload()}>
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <Routes>
      {/* ホーム：6タイルのメニュー */}
      <Route path="/" element={<Menu />} />

      {/* 一人で合コン → 合コン設定（Setup）へ。完了後はマイページに遷移 */}
      <Route path="/solo" element={<Setup onJoined={() => nav('/mypage')} />} />

      {/* 友達と合コン → 同じく Setup へ（将来、初期値や人数を分岐させるなら props を追加） */}
      <Route path="/friends" element={<Setup onJoined={() => nav('/mypage')} />} />

      {/* 以降はプレースホルダ（順次実装） */}
      <Route path="/flow" element={<Placeholder title="合コンの流れ" />} />
      <Route path="/about" element={<Placeholder title="サービス概要" />} />
      <Route path="/mypage" element={<Placeholder title="マイページ" />} />
      <Route path="/faq" element={<Placeholder title="よくある質問" />} />

      {/* 不明なパスはホームへ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}