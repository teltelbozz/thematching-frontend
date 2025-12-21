// src/screens/Profile.tsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 成功トーストは3秒で自動消滅（ただし今回は遷移するので基本見えません）
  useEffect(() => {
    if (msg === '保存しました。') {
      const t = setTimeout(() => setMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [msg]);

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
    if (saving) return;

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

      // ✅ 保存後は Setup へ遷移（?r=... があれば引き継ぐ）
      nav(`/setup${loc.search || ''}`, { replace: true });
      return;
    } catch (e) {
      console.error('[Profile] save failed', e);
      setMsg('保存に失敗しました。'); // ← エラーは自動消滅しない
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-600">読み込み中…</div>;

  const isError = msg && msg.includes('失敗');

  return (
    <div className="max-w-md mx-auto px-5 pb-28 pt-4">
      <h1 className="text-2xl font-bold tracking-tight text-center mb-6">
        プロフィール登録
      </h1>

      {/* カード: 基本情報 */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-5">
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
              onChange={(e) =>
                set('age', e.target.value === '' ? undefined : Number(e.target.value))
              }
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

      {/* カード: 学歴・居住 */}
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

      {/* カード: 詳細 */}
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
              onChange={(e) =>
                set('income', e.target.value === '' ? undefined : Number(e.target.value))
              }
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

      {isError && (
        <div className="text-center text-sm text-red-600 mt-4">{msg}</div>
      )}

      <div className="fixed inset-x-0 bottom-0 bg-white/80 backdrop-blur border-t border-gray-100 p-4">
        <button
          className="w-full h-12 rounded-xl bg-black text-white font-semibold disabled:opacity-60"
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
    <label className="block">
      <span className="text-[13px] text-gray-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}