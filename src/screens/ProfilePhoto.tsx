// src/screens/ProfilePhoto.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  getProfileDraft,
  saveProfileDraft,
  uploadProfileDraftPhoto,
  type ProfileDraftGetResponse,
} from '../api';
import { useLocation, useNavigate } from 'react-router-dom';

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

  // draftの写真（temp）
  photo_url?: string | null;
  photo_pathname?: string | null;
};

function normalizeDraft(resp: ProfileDraftGetResponse): DraftProfile | null {
  const d: any = (resp as any)?.draft ?? null;
  if (!d) return null;

  // いまバックエンドが profile_drafts を採用していて
  // 列名が draft_photo_url / draft_photo_pathname の場合にも吸収
  return {
    nickname: d.nickname ?? null,
    age: d.age ?? null,
    gender: d.gender ?? null,
    occupation: d.occupation ?? null,
    education: d.education ?? null,
    university: d.university ?? null,
    hometown: d.hometown ?? null,
    residence: d.residence ?? null,
    personality: d.personality ?? null,
    income: d.income ?? null,
    atmosphere: d.atmosphere ?? null,

    photo_url: d.photo_url ?? d.draft_photo_url ?? null,
    photo_pathname: d.photo_pathname ?? d.draft_photo_pathname ?? null,
  };
}

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

  const [draft, setDraft] = useState<DraftProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');

  const qsString = useMemo(() => {
    const qs = new URLSearchParams();
    if (requestedPath) qs.set('r', requestedPath);
    if (doneMode) qs.set('done', doneMode);
    const s = qs.toString();
    return s ? `?${s}` : '';
  }, [requestedPath, doneMode]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr('');
      try {
        const resp = await getProfileDraft(); // ✅ api.ts の正式API
        if (cancelled) return;

        const d = normalizeDraft(resp);
        setDraft(d);
        setPhotoUrl(d?.photo_url || '');
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
      // ✅ 412回避：確定プロフィール不要の「ドラフト用」アップロードを使う
      const up = await uploadProfileDraftPhoto(file);

      // ✅ draftへ反映（URL + pathname）
      // ProfileInput に pathname が無いので any で送る（バックエンドが受けるなら保存される）
      await saveProfileDraft({
        photo_url: up.url,
        photo_pathname: up.pathname,
      } as any);

      setPhotoUrl(up.url);
      setDraft((prev) => ({
        ...(prev || {}),
        photo_url: up.url,
        photo_pathname: up.pathname,
      }));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setUploading(false);
    }
  }

  function goConfirm() {
    nav(`/profile/confirm${qsString}`, { replace: true });
  }

  function goBack() {
    // ProfileDraft 画面（仮保存の入力画面）へ戻す
    nav(`/profile${qsString}`, { replace: true });
  }

  if (loading) return <div className="p-6 text-gray-600">読み込み中…</div>;

  // draftが無い（= 仮保存せずに直アクセス等）場合
  if (!draft) {
    return (
      <div className="min-h-screen overflow-y-auto max-w-md mx-auto px-5 pb-28 pt-4">
        <h1 className="text-2xl font-bold tracking-tight text-center mb-6">写真アップロード</h1>

        {!!err && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {err}
          </div>
        )}

        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-2">
          <div className="text-sm text-gray-800">
            先にプロフィール入力を「次へ（仮保存）」してください。
          </div>
        </section>

        <div className="fixed inset-x-0 bottom-0 bg-white/80 backdrop-blur border-t border-gray-100 p-4">
          <button
            className="w-full h-12 rounded-xl bg-black text-white font-semibold"
            onClick={goBack}
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto max-w-md mx-auto px-5 pb-28 pt-4">
      <h1 className="text-2xl font-bold tracking-tight text-center mb-6">写真アップロード</h1>

      {!!err && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm whitespace-pre-wrap">
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
            <div className="text-xs text-gray-500">
              画像は最大 5MB。次の確認画面で確定します。
            </div>
            {uploading && <div className="text-sm text-gray-700">アップロード中…</div>}
          </div>
        </div>

        <div className="text-xs text-gray-500">
          ※途中で離脱した場合は、仮保存データ／アップロード写真は破棄されます（確定は次画面のOK時）。
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-2 mt-5">
        <div className="text-sm font-semibold text-gray-900">入力内容（仮）</div>
        <div className="text-sm text-gray-700">ニックネーム: {draft.nickname || '（未入力）'}</div>
        <div className="text-sm text-gray-700">年齢: {draft.age ?? '（未入力）'}</div>
        <div className="text-sm text-gray-700">性別: {draft.gender || '（未入力）'}</div>
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