// src/screens/ProfileDraft.tsx
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
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

  photo_url?: string | null;
  photo_masked_url?: string | null;
};

type DraftGetResponse = {
  ok: true;
  draft: DraftProfile | null;
};

async function getDraft(): Promise<DraftGetResponse> {
  const r = await apiFetch('/profile/draft', { method: 'GET' });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`GET /profile/draft failed: ${r.status} ${t}`);
  }
  return r.json();
}

async function putDraft(payload: Partial<DraftProfile>): Promise<void> {
  const r = await apiFetch('/profile/draft', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`PUT /profile/draft failed: ${r.status} ${t}`);
  }
}

export default function ProfileDraft() {
  const nav = useNavigate();
  const loc = useLocation();

  const { requestedPath, doneMode } = useMemo(() => {
    const params = new URLSearchParams(loc.search);
    const r = params.get('r');
    const done = params.get('done'); // "close" など
    return {
      requestedPath: r && r.startsWith('/') ? r : '/',
      doneMode: done || '',
    };
  }, [loc.search]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string>('');

  const [form, setForm] = useState<DraftProfile>({
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const r = await getDraft();
        if (cancelled) return;
        const d = r?.draft || {};
        setForm({
          nickname: d.nickname ?? '',
          age: d.age ?? undefined,
          gender: d.gender ?? '',
          occupation: d.occupation ?? '',
          education: d.education ?? '',
          university: d.university ?? '',
          hometown: d.hometown ?? '',
          residence: d.residence ?? '',
          personality: d.personality ?? '',
          income: d.income ?? undefined,
          atmosphere: d.atmosphere ?? '',
          photo_url: d.photo_url ?? null,
          photo_masked_url: d.photo_masked_url ?? null,
        });
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function set<K extends keyof DraftProfile>(key: K, value: DraftProfile[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function onNext() {
    if (saving) return;
    setSaving(true);
    setErr('');

    try {
      const payload: Partial<DraftProfile> = {
        ...form,
        age:
          form.age === undefined || form.age === null || (form.age as any) === ''
            ? undefined
            : Number(form.age),
        income:
          form.income === undefined || form.income === null || (form.income as any) === ''
            ? undefined
            : Number(form.income),
      };

      await putDraft(payload);

      // 次は写真へ（r/done を引き回し）
      const qs = new URLSearchParams();
      if (requestedPath) qs.set('r', requestedPath);
      if (doneMode) qs.set('done', doneMode);
      nav(`/profile/photo?${qs.toString()}`, { replace: true });
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-600">読み込み中…</div>;

  return (
    <div className="min-h-screen overflow-y-auto max-w-md mx-auto px-5 pb-28 pt-4">
      <h1 className="text-2xl font-bold tracking-tight text-center mb-6">プロフィール登録</h1>

      {!!err && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {err}
        </div>
      )}

      {/* 注意：この画面では写真はアップしない */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-3">
        <div className="text-sm font-semibold text-gray-900">手順</div>
        <ol className="text-sm text-gray-600 list-decimal pl-5 space-y-1">
          <li>ここで入力 → 次へ（仮保存）</li>
          <li>写真アップロード</li>
          <li>確認 → OKで確定（途中離脱は破棄）</li>
        </ol>
      </section>

      {/* 基本情報 */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-5 mt-5">
        <Field label="ニックネーム">
          <input
            className="w-full h-11 border border-gray-300 rounded-lg px-3"
            value={form.nickname ?? ''}
            onChange={(e) => set('nickname', e.target.value)}
            placeholder="例）テスト太郎"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="年齢">
            <input
              className="w-full h-11 border border-gray-300 rounded-lg px-3"
              type="number"
              min={18}
              max={120}
              value={form.age ?? ''}
              onChange={(e) => set('age', e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="例）28"
            />
          </Field>

          <Field label="性別">
            <select
              className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
              value={form.gender ?? ''}
              onChange={(e) => set('gender', e.target.value)}
            >
              <option value="">選択してください</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
            </select>
          </Field>
        </div>
      </section>

      {/* 学歴・居住 */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-5 mt-5">
        <Field label="学歴">
          <input
            className="w-full h-11 border border-gray-300 rounded-lg px-3"
            value={form.education ?? ''}
            onChange={(e) => set('education', e.target.value)}
            placeholder="例）大学卒"
          />
        </Field>

        <Field label="大学">
          <input
            className="w-full h-11 border border-gray-300 rounded-lg px-3"
            value={form.university ?? ''}
            onChange={(e) => set('university', e.target.value)}
            placeholder="例）○○大学"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="出身地">
            <input
              className="w-full h-11 border border-gray-300 rounded-lg px-3"
              value={form.hometown ?? ''}
              onChange={(e) => set('hometown', e.target.value)}
              placeholder="例）福岡県"
            />
          </Field>

          <Field label="住まい">
            <input
              className="w-full h-11 border border-gray-300 rounded-lg px-3"
              value={form.residence ?? ''}
              onChange={(e) => set('residence', e.target.value)}
              placeholder="例）東京都渋谷区"
            />
          </Field>
        </div>
      </section>

      {/* 詳細 */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-5 mt-5">
        <Field label="職業">
          <input
            className="w-full h-11 border border-gray-300 rounded-lg px-3"
            value={form.occupation ?? ''}
            onChange={(e) => set('occupation', e.target.value)}
            placeholder="例）engineer"
          />
        </Field>

        <Field label="性格（選択／自由入力可）">
          <input
            className="w-full h-11 border border-gray-300 rounded-lg px-3"
            list="personality-list"
            value={form.personality ?? ''}
            onChange={(e) => set('personality', e.target.value)}
            placeholder="例）明るい盛り上げタイプ"
          />
          <datalist id="personality-list">
            <option value="明るい盛り上げタイプ" />
            <option value="落ち着いた聞き役タイプ" />
            <option value="ムードメーカー" />
          </datalist>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="年収（万円）">
            <input
              className="w-full h-11 border border-gray-300 rounded-lg px-3"
              type="number"
              min={0}
              value={form.income ?? ''}
              onChange={(e) => set('income', e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="例）650"
            />
          </Field>

          <Field label="雰囲気（選択／自由入力可）">
            <input
              className="w-full h-11 border border-gray-300 rounded-lg px-3"
              list="atmosphere-list"
              value={form.atmosphere ?? ''}
              onChange={(e) => set('atmosphere', e.target.value)}
              placeholder="例）クールなエリート系"
            />
            <datalist id="atmosphere-list">
              <option value="クールなエリート系" />
              <option value="親しみやすい癒し系" />
              <option value="おしゃれでスマート" />
            </datalist>
          </Field>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 bg-white/80 backdrop-blur border-t border-gray-100 p-4">
        <button
          className="w-full h-12 rounded-xl bg-black text-white font-semibold disabled:opacity-60"
          disabled={saving}
          onClick={onNext}
        >
          {saving ? '保存中…' : '次へ（仮保存）'}
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