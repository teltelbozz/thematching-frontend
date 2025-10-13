// src/App.tsx
import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { initLiff, whenAuthReady } from './liff';
import Menu from './screens/Menu';
import Profile from './screens/Profile';
import Setup from './screens/Setup';
import { getProfile } from './api';

function BootRouter(){
  const navigate = useNavigate();
  const routedOnce = useRef(false);

  useEffect(()=>{ initLiff(); },[]);

  useEffect(()=>{
    let cancelled = false;
    (async ()=>{
      await whenAuthReady();             // ← ログイン完了を待つ
      if (cancelled || routedOnce.current) return;
      routedOnce.current = true;

      try{
        const prof = await getProfile().catch(()=> null);
        // プロフィールの「未登録判定」は実装に合わせて調整
        const isRegistered = !!(prof && (prof.name || prof.displayName));
        navigate(isRegistered ? '/setup' : '/profile', { replace:true });
      }catch{
        // ここで何もしない：失敗しても二度とループさせない
      }
    })();
    return ()=>{ cancelled = true; };
  },[navigate]);

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