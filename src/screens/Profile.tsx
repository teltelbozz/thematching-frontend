// src/screens/Profile.tsx
import { useEffect, useState } from 'react';
import { getProfile, saveProfile } from '../api';

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
};

export default function ProfileScreen() {
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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 初期ロード
  useEffect(() => {
    (async () => {
      try {
        const r = await getProfile(); // { profile: {...} }
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
        });
      } catch (e) {
        console.warn('[Profile] load failed', e);
        setMsg('プロフィールの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave() {
    setSaving(true);
    setMsg(null);
    try {
      // age と income は数値に整形（空なら undefined）
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
      setMsg('保存しました。');
    } catch (e) {
      console.error('[Profile] save failed', e);
      setMsg('保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4">読み込み中…</div>;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">プロフィール登録</h1>

      <Field label="ニックネーム">
        <input
          className="w-full border rounded p-2"
          value={form.nickname ?? ''}
          onChange={(e) => set('nickname', e.target.value)}
          placeholder="例）テスト太郎"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="年齢">
          <input
            className="w-full border rounded p-2"
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
            className="w-full border rounded p-2"
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

      <Field label="学歴">
        <input
          className="w-full border rounded p-2"
          value={form.education ?? ''}
          onChange={(e) => set('education', e.target.value)}
          placeholder="例）大学卒"
        />
      </Field>

      <Field label="大学">
        <input
          className="w-full border rounded p-2"
          value={form.university ?? ''}
          onChange={(e) => set('university', e.target.value)}
          placeholder="例）○○大学"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="出身地">
          <input
            className="w-full border rounded p-2"
            value={form.hometown ?? ''}
            onChange={(e) => set('hometown', e.target.value)}
            placeholder="例）福岡県"
          />
        </Field>

        <Field label="住まい">
          <input
            className="w-full border rounded p-2"
            value={form.residence ?? ''}
            onChange={(e) => set('residence', e.target.value)}
            placeholder="例）東京都渋谷区"
          />
        </Field>
      </div>

      <Field label="職業">
        <input
          className="w-full border rounded p-2"
          value={form.occupation ?? ''}
          onChange={(e) => set('occupation', e.target.value)}
          placeholder="例）engineer"
        />
      </Field>

      <Field label="性格（選択／自由入力可）">
        <input
          className="w-full border rounded p-2"
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

      <div className="grid grid-cols-2 gap-4">
        <Field label="年収（万円）">
          <input
            className="w-full border rounded p-2"
            type="number"
            min={0}
            value={form.income ?? ''}
            onChange={(e) =>
              set('income', e.target.value === '' ? undefined : Number(e.target.value))
            }
            placeholder="例）650"
          />
        </Field>

        <Field label="雰囲気（選択／自由入力可）">
          <input
            className="w-full border rounded p-2"
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

      {msg && <div className="text-sm text-gray-600">{msg}</div>}

      <div className="pt-2">
        <button
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
          disabled={saving}
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
    <label className="block space-y-1">
      <span className="text-sm text-gray-600">{label}</span>
      {children}
    </label>
  );
}