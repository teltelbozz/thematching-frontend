// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- 追加: どんな未捕捉エラーもログ&画面表示する ---
function installGlobalErrorTrap() {
  const show = (msg: string) => {
    console.error('[global-error]', msg);
    (window as any).__bootFatal = msg;
    // 簡易フォールバック（React が落ちても表示される）
    const el = document.getElementById('root');
    if (el) el.innerHTML = `<pre style="padding:16px;color:#f66;background:#111;border:1px solid #333;border-radius:8px;white-space:pre-wrap;">${msg}</pre>`;
  };

  window.addEventListener('error', (e) => {
    show(`window.onerror: ${e.message}\n${String(e.error ?? '')}`);
  });

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const reason = (e && (e.reason?.stack || e.reason?.message || e.reason)) ?? 'unknown';
    show(`unhandledrejection: ${String(reason)}`);
  });
}
installGlobalErrorTrap();
// --- ここまで ---

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);