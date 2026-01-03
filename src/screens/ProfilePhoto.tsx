// src/screens/ProfilePhoto.tsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getProfileDraft,
  saveProfileDraft,
  uploadProfileDraftPhoto,
  type ProfileDraft,
} from '../api';

export default function ProfilePhoto() {
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
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const r = await getProfileDraft(); // { ok:true, draft }
        if (cancelled) return;

        const d = (r as any)?.draft ?? null;
        setDraft(d);
        setPhotoUrl(d?.draft_photo_url || '');
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

  async function onPick(file: File | null) {
    if (!file) return;
    setErr('');

    if (!file.type.startsWith('image/')) {
      setErr('画像ファイルを選択してください。');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr('画像サイズは最大 5MB です。');
      return;
    }

    setUploading(true);
    try {
      // ✅ draft用アップロード（/api/blob/profile-photo-draft）
      const up = await uploadProfileDraftPhoto(file);

      // ✅ draftテーブルへURL + pathname を保存（confirm/cancelが正しく動くように）
      await saveProfileDraft({
        draft_photo_url: up.url,
        draft_photo_pathname: up.pathname,
      } as any);

      // 画面反映
      setPhotoUrl(up.url);

      // draft再取得して表示安定（任意だがデバッグしやすい）
      const refreshed = await getProfileDraft();
      const d = (refreshed as any)?.draft ?? null;
      setDraft(d);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setUploading(false);
    }
  }

  function goConfirm() {
    const qs = new URLSearchParams();
    if (requestedPath) qs.set('r', requestedPath);
    if (doneMode) qs.set('done', doneMode);
    nav(`/profile/confirm?${qs.toString()}`, { replace: true });
  }

  function goBack() {
    const qs = new URLSearchParams();
    if (requestedPath) qs.set('r', requestedPath);
    if (doneMode) qs.set('done', doneMode);
    nav(`/profile?${qs.toString()}`, { replace: true });
  }

  if (loading) return <div className="p-6 text-gray-600">読み込み中…</div>;

  return (
    <div className="min-h-screen overflow-y-auto max-w-md mx-auto px-5 pb-28 pt-4">
      <h1 className="text-2xl font-bold tracking-tight text-center mb-6">写真アップロード</h1>

      {!!err && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {err}
        </div>
      )}

      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-4">
        <div className="text-[13px] text-gray-600">プロフィール写真</div>

        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
            {photoUrl ? (
              <img src={photoUrl} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <div className="text-xs text-gray-400">NO PHOTO</div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            />
            <div className="text-xs text-gray-500">画像は最大 5MB。次の確認画面で確定します。</div>
            {uploading && <div className="text-sm text-gray-700">アップロード中…</div>}
          </div>
        </div>

        <div className="text-xs text-gray-500">
          ※途中で離脱した場合は、仮保存データ／アップロード写真は破棄されます（確定は次画面のOK時）。
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-2 mt-5">
        <div className="text-sm font-semibold text-gray-900">入力内容（仮）</div>
        <div className="text-sm text-gray-700">ニックネーム: {draft?.nickname || '（未入力）'}</div>
        <div className="text-sm text-gray-700">年齢: {draft?.age ?? '（未入力）'}</div>
      </section>

      <div className="fixed inset-x-0 bottom-0 bg-white/80 backdrop-blur border-t border-gray-100 p-4 flex gap-3">
        <button
          className="flex-1 h-12 rounded-xl border border-gray-300 bg-white text-gray-900 font-semibold"
          onClick={goBack}
          disabled={uploading}
        >
          戻る
        </button>
        <button
          className="flex-1 h-12 rounded-xl bg-black text-white font-semibold disabled:opacity-60"
          onClick={goConfirm}
          disabled={uploading}
        >
          次へ（確認）
        </button>
      </div>
    </div>
  );
}