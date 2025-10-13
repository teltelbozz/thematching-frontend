// src/App.tsx
import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { initLiff, whenAuthReady } from './liff';
import Menu from './screens/Menu';
import Profile from './screens/Profile';
import Setup from './screens/Setup';
import { getProfile } from './api';

function BootRouter(){
  const navigate = useNavigate();
  const routedOnce = useRef(false);
  const [ready, setReady] = useState(false); // whenAuthReady() 解決を待つためのフラグ

  useEffect(() => {
    (async () => {
      try {
        console.log('[App] calling initLiff');
        await initLiff();
      } catch (e) {
        // ここでは握りつぶす（initLiff 内でログ済み）
      }
    })();
  }, []);

  useEffect(()=>{
    let cancelled = false;
    (async ()=>{
      try {
        await whenAuthReady();   // ← ログイン完了 or 失敗でも resolve される
      } finally {
        if (!cancelled) setReady(true);
      }

      if (cancelled || routedOnce.current) return;
      routedOnce.current = true;

      try{
        // プロフィールの「未登録判定」は実装に合わせて調整
        const prof = await getProfile().catch(()=> null);
        const isRegistered = !!(prof && (prof.name || prof.displayName));
        navigate(isRegistered ? '/setup' : '/profile', { replace:true });
      }catch (e){
        console.warn('[App] profile check failed, stay on /', e);
        // 何もしない：メニュー画面に留める
      }
    })();
    return ()=>{ cancelled = true; };
  },[navigate]);

  // whenAuthReady() 待ちの間は最低限のローディングを表示（真っ暗回避）
  if (!ready) {
    return <div style={{padding:'24px', fontSize:16}}>初期化中です…</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Menu />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="*" element={<Menu />} />
    </Routes>
  );
}

export default function App(){
  return (
    <BrowserRouter>
      <BootRouter/>
    </BrowserRouter>
  );
}