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
    <h1>DEBUG</h1>

    <div style={{ height: 1200, background: '#333', color: '#fff' }}>
      FORCE HEIGHT TEST
    </div>

    <div className="fixed inset-x-0 bottom-0 bg-white p-4">
      footer
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