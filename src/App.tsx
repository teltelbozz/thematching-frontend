// src/App.tsx
import { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { initLiff } from './liff';
import Menu from './screens/Menu';
import Setup from './Setup';
import './styles.css';

const Placeholder = ({ title }: { title: string }) => (
  <div className="safe">
    <h2 style={{ margin: '8px 0 12px' }}>{title}</h2>
    <p style={{ color: '#9aa0a6' }}>この画面は今後実装します。</p>
  </div>
);

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // boot: 起動中(booting) / 準備完了(ready) / エラー(error)
  const [boot, setBoot] = useState<'booting'|'ready'|'error'>('booting');
  const [errMsg, setErrMsg] = useState<string>('');
  const didInit = useRef(false); // StrictMode二重実行対策

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    (async () => {
      try {
        // 1) LIFF初期化 & /api/auth/login 完了（access_token がセットされる）
        await initLiff();

        // 2) クエリ ?r=/solo のような遷移先があればここで処理
        const sp = new URLSearchParams(location.search);
        const r = sp.get('r');
        if (r && r.startsWith('/')) {
          // 先頭スラッシュのみ許可（外部遷移を防ぐ）
          navigate(r, { replace: true });
        }

        setBoot('ready');
      } catch (e: any) {
        console.error('[App] init error:', e);
        setErrMsg(e?.message || String(e));
        setBoot('error');
      }
    })();
  // location.search は起動時だけ見ればよいので依存配列は空
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
        <div style={{ color: '#e87d7d', marginBottom: 12 }}>{errMsg}</div>
        <button className="tile" style={{ width: 180, height: 44 }} onClick={() => location.reload()}>
          再読み込み
        </button>
      </div>
    );
  }

  // boot === 'ready'
  return (
    <Routes>
      {/* ホーム（6タイルのメニュー） */}
      <Route path="/" element={<Menu />} />

      {/* 一人で合コン／友達と合コン → Setup へ。
          保存・参加完了後にマイページへ飛ばしたい場合は onJoined を使う */}
      <Route path="/solo" element={<Setup onJoined={() => navigate('/mypage')} />} />
      <Route path="/friends" element={<Setup onJoined={() => navigate('/mypage')} />} />

      {/* 未実装プレースホルダ */}
      <Route path="/flow" element={<Placeholder title="合コンの流れ" />} />
      <Route path="/about" element={<Placeholder title="サービス概要" />} />
      <Route path="/mypage" element={<Placeholder title="マイページ" />} />
      <Route path="/faq" element={<Placeholder title="よくある質問" />} />

      {/* 不明パスはホームへ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}