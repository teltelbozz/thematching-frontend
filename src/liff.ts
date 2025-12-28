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
  if (initFinished) return;
  if (initStarted) {
    await whenAuthReady();
    return;
  }
  initStarted = true;

  try {
    if (!LIFF_ID) throw new Error('missing VITE_LIFF_ID');

    await liff.init({ liffId: LIFF_ID });
    await liff.ready;

    if (!liff.isLoggedIn?.()) {
      if (looping()) {
        console.warn('[liff] login loop detected (not logged in). resolve anyway.');
        _resolve();
        return;
      }
      mark();
      await liff.login({ redirectUri: location.href });
      return;
    }

    const idt = liff.getIDToken();
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

    await serverLoginWithIdToken(idt);

    clear();
    initFinished = true;
    _resolve();
  } catch (e) {
    console.error('[liff] init error:', e);
    _resolve();
  }
}

/**
 * LIFF内ならウィンドウを閉じる（閉じられたら true）
 * - ブラウザ等では false（例外は握りつぶす）
 */
export function closeLiffWindowSafe(): boolean {
  try {
    if ((liff as any).isInClient?.()) {
      (liff as any).closeWindow?.();
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}