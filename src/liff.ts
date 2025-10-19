// src/liff.ts
import liff from '@line/liff';
import { serverLoginWithIdToken } from './api';

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string;

let _resolve!: () => void;
const authReady = new Promise<void>((r) => (_resolve = r));
export function whenAuthReady() { return authReady; }

const KEY = 'liff_login_in_progress';

// --- login-loop guard helpers ---
function mark()  { sessionStorage.setItem(KEY, String(Date.now())); }
function clear() { sessionStorage.removeItem(KEY); }
function looping(withinMs = 60_000) {
  const t = Number(sessionStorage.getItem(KEY) || 0);
  return !!t && Date.now() - t < withinMs;
}

// --- base64url-safe decode & JWT payload parse ---
function b64urlToUtf8(input: string): string {
  let s = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad) s += '='.repeat(4 - pad);
  // atob → UTF-8 復元（escape/encode 併用）
  return decodeURIComponent(escape(atob(s)));
}

function parseJwt<T = any>(token: string): T {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('invalid_jwt');
  const payloadJson = b64urlToUtf8(parts[1]);
  return JSON.parse(payloadJson);
}

function isIdTokenExpiringOrExpired(idToken: string, skewMs = 30_000) {
  try {
    const { exp } = parseJwt<{ exp?: number }>(idToken);
    if (!exp) return true;
    return exp * 1000 < Date.now() + skewMs;
  } catch {
    return true;
  }
}

// --- idempotent init guard ---
let initStarted = false;
let initFinished = false;

export async function initLiff() {
  if (initFinished) return;                // すでに完了済み
  if (initStarted) {                       // 進行中なら待つだけ
    await whenAuthReady();
    return;
  }
  initStarted = true;

  try {
    if (!LIFF_ID) throw new Error('missing VITE_LIFF_ID');

    await liff.init({ liffId: LIFF_ID });
    await liff.ready;

    // 未ログイン → ログイン発火（1分以内の多重回避）
    if (!liff.isLoggedIn?.()) {
      if (looping()) {
        console.warn('[liff] login loop detected (not logged in). resolve anyway.');
        _resolve(); // ここで待ちを解放して画面が固まらないようにする
        return;
      }
      mark();
      await liff.login({ redirectUri: location.href });
      return; // ここでリダイレクトして戻らない想定
    }

    // id_token の鮮度確認（exp が近い/切れてる → 再ログイン）
    let idt = liff.getIDToken();
    if (!idt || isIdTokenExpiringOrExpired(idt)) {
      if (looping()) {
        console.warn('[liff] login loop detected (stale id_token). resolve anyway.');
        _resolve();
        return;
      }
      mark();
      await liff.login({ redirectUri: location.href });
      return;
    }

    // サーバログイン（アクセストークン取得）
    await serverLoginWithIdToken(idt);

    clear();
    initFinished = true;
    _resolve();
  } catch (e) {
    console.error('[liff] init error:', e);
    // 失敗しても画面がいつまでも「起動中…」にならないよう解放する
    _resolve();
  }
}