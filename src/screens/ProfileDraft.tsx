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

const EDUCATION_OPTIONS = [
  '中学卒',
  '高校卒',
  '専門学校卒',
  '短大卒',
  '大学卒',
  '大学院卒',
  'その他',
];

const HOMETOWN_OPTIONS = [
  '北海道',
  '東北',
  '関東',
  '中部',
  '近畿',
  '中国',
  '四国',
  '九州・沖縄',
  '海外',
];

const PERSONALITY_OPTIONS = [
  '明るい盛り上げタイプ',
  '落ち着いた聞き役タイプ',
  'ムードメーカー',
  '誠実でまじめ',
  '行動力がある',
  '気配り上手',
];

const ATMOSPHERE_OPTIONS = [
  'クールなエリート系',
  '親しみやすい癒し系',
  'おしゃれでスマート',
  'ナチュラルでやさしい',
  '大人っぽい落ち着き系',
  'アクティブで爽やか',
];

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  function parseDigitsAsNumber(v: string): number | undefined {
    const digits = v.replace(/\D/g, '');
    if (!digits) return undefined;
    return Number(digits);
  }

  async function onNext() {
    if (saving) return;
    setSaving(true);
    setErr('');

    try {
      const nextErrors: Record<string, string> = {};
      const nickname = (form.nickname ?? '').trim();
      const age = form.age;
      const gender = (form.gender ?? '').trim();

      if (!nickname) nextErrors.nickname = 'ニックネームは必須です。';
      if (age == null || !Number.isInteger(age) || age < 18 || age > 120) {
        nextErrors.age = '年齢は18〜120の整数で入力してください。';
      }
      if (!gender) nextErrors.gender = '性別は必須です。';

      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        setErr('入力内容を確認してください。');
        return;
      }

      const payload: Partial<DraftProfile> = {
        ...form,
        nickname,
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
        <Field label="ニックネーム（必須）">
          <input
            className="w-full h-11 border border-gray-300 rounded-lg px-3"
            value={form.nickname ?? ''}
            onChange={(e) => set('nickname', e.target.value)}
            placeholder="例）テスト太郎"
          />
          {fieldErrors.nickname && <div className="text-xs text-red-600 mt-1">{fieldErrors.nickname}</div>}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="年齢（必須）">
            <input
              className="w-full h-11 border border-gray-300 rounded-lg px-3"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.age ?? ''}
              onChange={(e) => set('age', parseDigitsAsNumber(e.target.value))}
              placeholder="例）28"
            />
            {fieldErrors.age && <div className="text-xs text-red-600 mt-1">{fieldErrors.age}</div>}
          </Field>

          <Field label="性別（必須）">
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
            {fieldErrors.gender && <div className="text-xs text-red-600 mt-1">{fieldErrors.gender}</div>}
          </Field>
        </div>
      </section>

      {/* 学歴・居住 */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-5 mt-5">
        <Field label="学歴">
          <select
            className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
            value={form.education ?? ''}
            onChange={(e) => set('education', e.target.value)}
          >
            <option value="">選択してください</option>
            {EDUCATION_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
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
            <select
              className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
              value={form.hometown ?? ''}
              onChange={(e) => set('hometown', e.target.value)}
            >
              <option value="">選択してください</option>
              {HOMETOWN_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
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

        <Field label="性格（選択制）">
          <select
            className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
            value={form.personality ?? ''}
            onChange={(e) => set('personality', e.target.value)}
          >
            <option value="">選択してください</option>
            {PERSONALITY_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="年収（万円）">
            <input
              className="w-full h-11 border border-gray-300 rounded-lg px-3"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.income ?? ''}
              onChange={(e) => set('income', parseDigitsAsNumber(e.target.value))}
              placeholder="例）650"
            />
          </Field>

          <Field label="雰囲気（選択制）">
            <select
              className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
              value={form.atmosphere ?? ''}
              onChange={(e) => set('atmosphere', e.target.value)}
            >
              <option value="">選択してください</option>
              {ATMOSPHERE_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
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
