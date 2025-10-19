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
      await whenAuthReady();
      if (cancelled || routedOnce.current) return;
      routedOnce.current = true;

      try{
        const { profile } = await getProfile().catch(()=> ({ profile:null }));
        const isRegistered = !!(profile && (profile.nickname || profile.displayName || profile.name));
        navigate(isRegistered ? '/setup' : '/profile', { replace:true });
      }catch{
        // 失敗してもループさせない
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