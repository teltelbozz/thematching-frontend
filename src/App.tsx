// src/App.tsx
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initLiff, whenAuthReady } from './liff';
import Menu from './screens/Menu';
import Profile from './screens/Profile';
import Setup from './Setup';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initLiff();
        await whenAuthReady();
        setReady(true);
      } catch (err) {
        console.error('[App] LIFF init failed:', err);
        setError('LIFF initialization failed');
      }
    })();
  }, []);

  if (error) {
    return <div style={{ padding: 20, color: 'red' }}>{error}</div>;
  }

  if (!ready) {
    return <div style={{ padding: 20 }}>Loading LINE login...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/setup" element={<Setup />} />
      </Routes>
    </BrowserRouter>
  );
}