// src/screens/ProfileConfirm.tsx
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, getMe } from '../api';
import { useLocation, useNavigate } from 'react-router-dom';
import { closeLiffWindowSafe } from '../liff';

type DraftProfile = {
  nickname?: string | null;
  age?: number | null;
  gender?: string | null;
  occupation?: string | null;
  education?: string | null;
  university?: string | null;
  hometown?: string | null;
  residence?: string | null;
  personality?: string | null;
  income?: number | null;
  atmosphere?: string | null;

  // ✅ draftテーブルの正式カラム
  draft_photo_url?: string | null;
  draft_photo_pathname?: string | null;

  // ✅ 旧実装互換（残してOK）
  photo_url?: string | null;
  photo_masked_url?: string | null;
};

type DraftGetResponse = { ok: true; draft: DraftProfile | null };

async function getDraft(): Promise<DraftGetResponse> {
  const r = await apiFetch('/profile/draft', { method: 'GET' });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`GET /profile/draft failed: ${r.status} ${t}`);
  }
  return r.json();
}

async function confirmProfile(): Promise<void> {
  const r = await apiFetch('/profile/confirm', { method: 'POST', body: JSON.stringify({}) });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`POST /profile/confirm failed: ${r.status} ${t}`);
  }
}

async function cancelProfile(): Promise<void> {
  const r = await apiFetch('/profile/cancel', { method: 'POST', body: JSON.stringify({}) });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`POST /profile/cancel failed: ${r.status} ${t}`);
  }
}

function fmtGender(g?: string | null) {
  if (!g) return '（未入力）';
  if (g === 'male') return '男性';
  if (g === 'female') return '女性';
  if (g === 'other') return 'その他';
  return g;
}

export default function ProfileConfirm() {
  const nav = useNavigate();
  const loc = useLocation();

  const { requestedPath, doneMode } = useMemo(() => {
    const params = new URLSearchParams(loc.search);
    const r = params.get('r');
    const done = params.get('done');
    return {
      requestedPath: r && r.startsWith('/') ? r : '/',
      doneMode: done || '',
    };
  }, [loc.search]);

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState('');
  const [draft, setDraft] = useState<DraftProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const r = await getDraft();
        if (cancelled) return;
        setDraft(r?.draft ?? null);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ draftの正式カラムを優先し、旧実装にも対応
  const photoUrl = draft?.draft_photo_url || draft?.photo_url || '';

  async function onOk() {
    if (posting) return;
    setPosting(true);
    setErr('');
    try {
      await confirmProfile();

      await getMe().catch(() => null);

      if (doneMode === 'close') {
        const closed = closeLiffWindowSafe();
        if (!closed) nav(requestedPath || '/', { replace: true });
        return;
      }

      nav('/mypage', { replace: true });
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setPosting(false);
    }
  }

  async function onCancel() {
    if (posting) return;
    const ok = confirm('仮保存データと写真を破棄します。よろしいですか？');
    if (!ok) return;

    setPosting(true);
    setErr('');
    try {
      await cancelProfile();
      nav('/', { replace: true });
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setPosting(false);
    }
  }

  function onBack() {
    const qs = new URLSearchParams();
    if (requestedPath) qs.set('r', requestedPath);
    if (doneMode) qs.set('done', doneMode);
    nav(`/profile/photo?${qs.toString()}`, { replace: true });
  }

  if (loading) return <div className="p-6 text-gray-600">読み込み中…</div>;

  return (
    <div className="min-h-screen overflow-y-auto max-w-md mx-auto px-5 pb-28 pt-4">
      <h1 className="text-2xl font-bold tracking-tight text-center mb-6">内容確認</h1>

      {!!err && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {err}
        </div>
      )}

      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-4">
        <div className="text-sm font-semibold text-gray-900">写真</div>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
            {photoUrl ? (
              <img src={photoUrl} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <div className="text-xs text-gray-400">NO PHOTO</div>
            )}
          </div>
          <div className="text-xs text-gray-500">※OKを押すと確定します</div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-2 mt-5">
        <div className="text-sm font-semibold text-gray-900">プロフィール</div>
        <Row label="ニックネーム" value={draft?.nickname || '（未入力）'} />
        <Row label="年齢" value={draft?.age != null ? String(draft.age) : '（未入力）'} />
        <Row label="性別" value={fmtGender(draft?.gender)} />
        <Row label="職業" value={draft?.occupation || '（未入力）'} />
        <Row label="学歴" value={draft?.education || '（未入力）'} />
        <Row label="大学" value={draft?.university || '（未入力）'} />
        <Row label="出身地" value={draft?.hometown || '（未入力）'} />
        <Row label="住まい" value={draft?.residence || '（未入力）'} />
        <Row label="性格" value={draft?.personality || '（未入力）'} />
        <Row label="年収（万円）" value={draft?.income != null ? String(draft.income) : '（未入力）'} />
        <Row label="雰囲気" value={draft?.atmosphere || '（未入力）'} />
      </section>

      <div className="fixed inset-x-0 bottom-0 bg-white/80 backdrop-blur border-t border-gray-100 p-4 space-y-3">
        <div className="flex gap-3">
          <button
            className="flex-1 h-12 rounded-xl border border-gray-300 bg-white text-gray-900 font-semibold disabled:opacity-60"
            onClick={onBack}
            disabled={posting}
          >
            戻る
          </button>
          <button
            className="flex-1 h-12 rounded-xl bg-black text-white font-semibold disabled:opacity-60"
            onClick={onOk}
            disabled={posting}
          >
            {posting ? '確定中…' : 'OK（確定）'}
          </button>
        </div>

        <button
          className="w-full h-11 rounded-xl border border-red-200 bg-red-50 text-red-700 font-semibold disabled:opacity-60"
          onClick={onCancel}
          disabled={posting}
        >
          キャンセル（破棄）
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm text-gray-900 text-right break-words">{value}</div>
    </div>
  );
}