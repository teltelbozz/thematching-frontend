// src/screens/Profile.tsx
import { useEffect, useMemo, useState } from 'react';
import { getMe, getProfile, saveProfile, uploadProfilePhoto } from '../api';
import { useLocation, useNavigate } from 'react-router-dom';
import { closeLiffWindowSafe } from '../liff';

type Profile = {
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

  photo_url?: string | null;
  photo_masked_url?: string | null;
};

export default function ProfileScreen() {
  const nav = useNavigate();
  const loc = useLocation();

  const [form, setForm] = useState<Profile>({
    nickname: '',
    age: undefined,
    gender: '',
    occupation: '',
    education: '',
    university: '',
    hometown: '',
    residence: '',
    personality: '',
    income: undefined,
    atmosphere: '',
    photo_url: null,
    photo_masked_url: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoErr, setPhotoErr] = useState<string>('');

  // ✅ A設計：プロフィール行が無い状態ではアップロードできない
  const [canUploadPhoto, setCanUploadPhoto] = useState(false);

  const { requestedPath, doneMode } = useMemo(() => {
    const params = new URLSearchParams(loc.search);
    const r = params.get('r');
    const done = params.get('done'); // "close"
    return {
      requestedPath: r && r.startsWith('/') ? r : '/',
      doneMode: done || '',
    };
  }, [loc.search]);

  useEffect(() => {
    if (msg === '保存しました。') {
      const t = setTimeout(() => setMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [msg]);

  useEffect(() => {
    (async () => {
      try {
        const r = await getProfile();
        const p = (r?.profile || {}) as any;

        setForm({
          nickname: p.nickname ?? '',
          age: p.age ?? undefined,
          gender: p.gender ?? '',
          occupation: p.occupation ?? '',
          education: p.education ?? '',
          university: p.university ?? '',
          hometown: p.hometown ?? '',
          residence: p.residence ?? '',
          personality: p.personality ?? '',
          income: p.income ?? undefined,
          atmosphere: p.atmosphere ?? '',
          photo_url: p.photo_url ?? null,
          photo_masked_url: p.photo_masked_url ?? null,
        });

        // ✅ まず /me の hasProfile で「行があるか」を判定
        const me = await getMe().catch(() => null);
        setCanUploadPhoto(!!me?.hasProfile);
      } catch (e) {
        console.warn('[Profile] load failed', e);
        setMsg('プロフィールの読み込みに失敗しました。');
        setCanUploadPhoto(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    setPhotoErr('');
    setMsg(null);

    // ✅ A設計：保存前アップロードは禁止（孤児Blob防止）
    if (!canUploadPhoto) {
      setPhotoErr('先にプロフィールを一度「保存」してください（保存後に写真をアップロードできます）。');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPhotoErr('画像ファイルを選択してください。');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoErr('画像サイズは最大 5MB です。');
      return;
    }

    setPhotoUploading(true);
    try {
      const up = await uploadProfilePhoto(file);
      set('photo_url', up.url);
    } catch (e: any) {
      console.error('[Profile] photo upload failed', e);
      setPhotoErr(e?.message || '写真アップロードに失敗しました。');
    } finally {
      setPhotoUploading(false);
    }
  }

  async function onSave() {
    setSaving(true);
    setMsg(null);

    try {
      const payload: any = {
        ...form,
        age:
          form.age === undefined || form.age === null || form.age === ('' as any)
            ? undefined
            : Number(form.age),
        income:
          form.income === undefined || form.income === null || form.income === ('' as any)
            ? undefined
            : Number(form.income),
      };

      await saveProfile(payload);

      // ✅ 保存したら hasProfile=true になるのでアップロード解放
      setCanUploadPhoto(true);

      if (doneMode === 'close') {
        const closed = closeLiffWindowSafe();
        if (!closed) nav(requestedPath || '/', { replace: true });
        return;
      }

      setMsg('保存しました。');
    } catch (e) {
      console.error('[Profile] save failed', e);
      setMsg('保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-600">読み込み中…</div>;

  const isError = msg && msg.includes('失敗');

  return (
    <div className="min-h-screen overflow-y-auto max-w-md mx-auto px-5 pb-28 pt-4">
      <h1 className="text-2xl font-bold tracking-tight text-center mb-6">プロフィール登録</h1>
<div className="mt-6 p-3 text-xs bg-yellow-100 text-black rounded">
  debug: scrollHeight={document.documentElement.scrollHeight} / innerHeight={window.innerHeight}
</div>
      {/* 写真 */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-4">
        <div className="text-[13px] text-gray-600">プロフィール写真</div>

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
            {form.photo_url ? (
              <img src={form.photo_url} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <div className="text-xs text-gray-400">NO PHOTO</div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <input
              type="file"
              accept="image/*"
              disabled={photoUploading || !canUploadPhoto}
              onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
            />

            {!canUploadPhoto && (
              <div className="text-xs text-amber-700">
                ※ 先にプロフィールを一度保存してください（孤児Blobを残さない設計のため）
              </div>
            )}

            <div className="text-xs text-gray-500">
              画像は最大 5MB。アップロード後、プロフィール保存時に確定します。
            </div>

            {photoUploading && <div className="text-sm text-gray-700">写真をアップロード中…</div>}
            {!!photoErr && <div className="text-sm text-red-600">{photoErr}</div>}
          </div>
        </div>
      </section>

      {/* 以下、あなたの既存UIはそのまま（省略せず貼るならここに続けてOK） */}
      {/* ...（基本情報/学歴/詳細/トースト）... */}

      {isError && <div className="text-center text-sm text-red-600 mt-4">{msg}</div>}

      {msg === '保存しました。' && (
        <div role="status" aria-live="polite" className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50">
          <div className="rounded-lg bg-black text-white/95 px-4 py-2 shadow-lg shadow-black/20">
            保存しました
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 bg-white/80 backdrop-blur border-t border-gray-100 p-4">
        <button
          className="w-full h-12 rounded-xl bg-black text-white font-semibold disabled:opacity-60"
          disabled={saving || photoUploading}
          onClick={onSave}
        >
          {saving ? '保存中…' : '保存して次へ'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] text-gray-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}