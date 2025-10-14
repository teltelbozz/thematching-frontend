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
  const [bootLog, setBootLog] = useState<string>('booting…');
  const [ready, setReady] = useState(false);

  const log = (m: string) => {
    console.log('[Boot]', m);
    setBootLog(prev => prev + '\n' + m);
  };

  useEffect(()=>{
    log('initLiff() call');
    initLiff().catch(e=>{
      log('initLiff error: ' + (e?.message || String(e)));
    });
  },[]);

  useEffect(()=>{
    let cancelled = false;
    (async ()=>{
      try{
        log('waiting whenAuthReady()');
        await whenAuthReady();
        if (cancelled) return;
        setReady(true);
        log('auth ready');

        if (routedOnce.current) return;
        routedOnce.current = true;

        log('fetching profile');
        const prof = await getProfile().catch((e)=>{ log('getProfile failed: '+String(e)); return null; });
        const isRegistered = !!(prof && (prof.name || prof.displayName));
        log('navigate: ' + (isRegistered ? '/setup' : '/profile'));
        navigate(isRegistered ? '/setup' : '/profile', { replace:true });
      }catch(e:any){
        log('boot flow error: ' + (e?.message || String(e)));
        // ここでは何もせず、メニュー表示に落とす
      }
    })();
    return ()=>{ cancelled = true; };
  },[navigate]);

  // フォールバック：auth 完了までメニューでなく「起動中」を見せる
  if (!ready){
    return (
      <div style={{padding:'16px', fontFamily:'system-ui, sans-serif', color:'#ddd', background:'#111', minHeight:'100vh'}}>
        <h2>起動中…</h2>
        <pre style={{whiteSpace:'pre-wrap', fontSize:12, lineHeight:1.5, color:'#aaa'}}>{bootLog}</pre>
        <div style={{marginTop:8, fontSize:12, color:'#888'}}>
          __liffInitError: {(window as any).__liffInitError ?? '(none)'}<br/>
          __bootFatal: {(window as any).__bootFatal ?? '(none)'}
        </div>
      </div>
    );
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