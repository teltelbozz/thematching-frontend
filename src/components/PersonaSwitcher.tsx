// src/components/PersonaSwitcher.tsx
import { useEffect, useState } from 'react';

const PERSONAS = ['dev:aki', 'dev:yui', 'dev:ken', 'dev:mika']; // 好きなだけ追加

export default function PersonaSwitcher(){
  const [val, setVal] = useState<string>(() => localStorage.getItem('devUser') || PERSONAS[0]);

  useEffect(()=>{ localStorage.setItem('devUser', val); }, [val]);

  if (!import.meta.env.DEV) return null; // 本番で表示しない

  return (
    <div style={{ position:'fixed', top:10, right:10, zIndex:9999 }}>
      <select value={val} onChange={e=>setVal(e.target.value)} style={{ padding:6 }}>
        {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  );
}