// src/screens/MatchPrefs.tsx
import { useEffect, useState } from 'react';
import { getMatchPrefs, saveMatchPrefs } from '../api';

// バックエンドのフィールド名に合わせた型（null を許容）
type MatchPrefs = {
  purpose: string | null;
  partner_age_min: number | null;
  partner_age_max: number | null;
  partner_gender: 'male' | 'female' | 'any' | null;
  // 将来タグ化予定。今はカンマ区切り文字列で編集して保存時に配列へ。
  partner_personality_tags: string[] | null;
  partner_atmosphere_tags: string[] | null;
  partner_style_tags: string[] | null;
  preferred_slots: any | null;     // 将来 JSON UI にする想定。今はテキスト入力で JSON 受け付け。
  areas: string[] | null;          // カンマ区切り
  venue_types: string[] | null;    // カンマ区切り
  pay_policy: 'male_pays' | 'split' | 'flex' | null;
  party_size: number | null;       // 1–4
  allow_friends: boolean | null;
  use_intro_free: boolean | null;
  auto_subscribe_ack: boolean | null;
  priority_weights: any | null;    // 将来 JSON UI
};

function arrToComma(v?: string[] | null) {
  return (v && v.length) ? v.join(', ') : '';
}
function commaToArr(v: string) {
  return v
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export default function MatchPrefsScreen() {
  const [form, setForm] = useState({
    purpose: '',
    partner_age_min: '' as number | '' ,
    partner_age_max: '' as number | '' ,
    partner_gender: 'any',
    partner_personality_tags: '',
    partner_atmosphere_tags: '',
    partner_style_tags: '',
    preferred_slots_text: '',   // JSON テキスト
    areas: '',
    venue_types: '',
    pay_policy: 'flex',
    party_size: 1 as number,
    allow_friends: true,
    use_intro_free: false,
    auto_subscribe_ack: false,
    priority_weights_text: '',  // JSON テキスト
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 初期ロード
  useEffect(() => {
    (async () => {
      try {
        const r = await getMatchPrefs(); // {prefs: {...}}
        const p: MatchPrefs = r?.prefs ?? {};
        setForm({
          purpose: p.purpose ?? '',
          partner_age_min: p.partner_age_min ?? '',
          partner_age_max: p.partner_age_max ?? '',
          partner_gender: (p.partner_gender ?? 'any') as any,
          partner_personality_tags: arrToComma(p.partner_personality_tags ?? []),
          partner_atmosphere_tags: arrToComma(p.partner_atmosphere_tags ?? []),
          partner_style_tags: arrToComma(p.partner_style_tags ?? []),
          preferred_slots_text: p.preferred_slots ? JSON.stringify(p.preferred_slots) : '',
          areas: arrToComma(p.areas ?? []),
          venue_types: arrToComma(p.venue_types ?? []),
          pay_policy: (p.pay_policy ?? 'flex') as any,
          party_size: p.party_size ?? 1,
          allow_friends: p.allow_friends ?? true,
          use_intro_free: p.use_intro_free ?? false,
          auto_subscribe_ack: p.auto_subscribe_ack ?? false,
          priority_weights_text: p.priority_weights ? JSON.stringify(p.priority_weights) : '',
        });
      } catch (e) {
        console.warn('[match-prefs] load failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function onSave() {
    setSaving(true);
    try {
      // 文字列→数値 / 配列 / JSON に整形
      const payload = {
        purpose: form.purpose || undefined,
        partner_age_min: form.partner_age_min === '' ? undefined : Number(form.partner_age_min),
        partner_age_max: form.partner_age_max === '' ? undefined : Number(form.partner_age_max),
        partner_gender: form.partner_gender || 'any',
        partner_personality_tags: commaToArr(form.partner_personality_tags),
        partner_atmosphere_tags: commaToArr(form.partner_atmosphere_tags),
        partner_style_tags: commaToArr(form.partner_style_tags),
        preferred_slots: form.preferred_slots_text
          ? safeJSON(form.preferred_slots_text)
          : null,
        areas: commaToArr(form.areas),
        venue_types: commaToArr(form.venue_types),
        pay_policy: form.pay_policy || 'flex',
        party_size: Number(form.party_size || 1),
        allow_friends: !!form.allow_friends,
        use_intro_free: !!form.use_intro_free,
        auto_subscribe_ack: !!form.auto_subscribe_ack,
        priority_weights: form.priority_weights_text
          ? safeJSON(form.priority_weights_text)
          : null,
      };

      await saveMatchPrefs(payload);
      // トースト（3秒で自然消滅）
      setToast('保存しました');
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    } catch (e) {
      console.error('[match-prefs] save failed', e);
      setToast('保存に失敗しました');
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-600">読み込み中…</div>;

  return (
    <div className="max-w-md mx-auto px-5 pb-28 pt-4">
      <h1 className="text-2xl font-bold tracking-tight text-center mb-6">
        希望条件の設定
      </h1>

      {/* 目的 */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-5">
        <Field label="目的">
          <select
            className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
            value={form.purpose}
            onChange={(e) => set('purpose', e.target.value)}
          >
            <option value="">選択してください</option>
            <option value="friend">友だち作り</option>
            <option value="dating">恋人探し</option>
            <option value="party">わいわい重視</option>
            <option value="serious">真剣</option>
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="相手の年齢(下限)">
            <input
              className="w-full h-11 border border-gray-300 rounded-lg px-3"
              type="number" min={18} max={80}
              value={form.partner_age_min}
              onChange={(e) => set('partner_age_min', e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="例) 20"
            />
          </Field>
          <Field label="相手の年齢(上限)">
            <input
              className="w-full h-11 border border-gray-300 rounded-lg px-3"
              type="number" min={18} max={80}
              value={form.partner_age_max}
              onChange={(e) => set('partner_age_max', e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="例) 28"
            />
          </Field>
        </div>

        <Field label="相手の性別">
          <select
            className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
            value={form.partner_gender}
            onChange={(e) => set('partner_gender', e.target.value as any)}
          >
            <option value="any">指定なし</option>
            <option value="female">女性</option>
            <option value="male">男性</option>
          </select>
        </Field>
      </section>

      {/* タグ/エリアなど */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-5 mt-5">
        <Field label="相手の性格タグ（カンマ区切り）">
          <input
            className="w-full h-11 border border-gray-300 rounded-lg px-3"
            value={form.partner_personality_tags}
            onChange={(e) => set('partner_personality_tags', e.target.value)}
            placeholder="例) 明るい盛り上げタイプ, 落ち着き"
          />
        </Field>

        <Field label="相手の雰囲気タグ（カンマ区切り）">
          <input
            className="w-full h-11 border border-gray-300 rounded-lg px-3"
            value={form.partner_atmosphere_tags}
            onChange={(e) => set('partner_atmosphere_tags', e.target.value)}
            placeholder="例) クール, 癒し系"
          />
        </Field>

        <Field label="相手のスタイルタグ（カンマ区切り）">
          <input
            className="w-full h-11 border border-gray-300 rounded-lg px-3"
            value={form.partner_style_tags}
            onChange={(e) => set('partner_style_tags', e.target.value)}
            placeholder="例) カジュアル, きれいめ"
          />
        </Field>

        <Field label="希望エリア（カンマ区切り）">
          <input
            className="w-full h-11 border border-gray-300 rounded-lg px-3"
            value={form.areas}
            onChange={(e) => set('areas', e.target.value)}
            placeholder="例) 恵比寿, 渋谷"
          />
        </Field>

        <Field label="希望ジャンル（カンマ区切り）">
          <input
            className="w-full h-11 border border-gray-300 rounded-lg px-3"
            value={form.venue_types}
            onChange={(e) => set('venue_types', e.target.value)}
            placeholder="例) 居酒屋, バー"
          />
        </Field>
      </section>

      {/* 会の条件 */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-5 mt-5">
        <Field label="支払い方針">
          <select
            className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
            value={form.pay_policy}
            onChange={(e) => set('pay_policy', e.target.value as any)}
          >
            <option value="flex">相手に合わせる</option>
            <option value="male_pays">男性が支払う</option>
            <option value="split">割り勘</option>
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="人数（自チーム）">
            <input
              className="w-full h-11 border border-gray-300 rounded-lg px-3"
              type="number" min={1} max={4}
              value={form.party_size}
              onChange={(e) => set('party_size', Number(e.target.value || 1))}
            />
          </Field>

          <Field label="友人同伴OK">
            <div className="h-11 flex items-center">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={!!form.allow_friends}
                onChange={(e) => set('allow_friends', e.target.checked)}
              />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="初回紹介無料の利用意思">
            <div className="h-11 flex items-center">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={!!form.use_intro_free}
                onChange={(e) => set('use_intro_free', e.target.checked)}
              />
            </div>
          </Field>

          <Field label="自動課金に同意（仮）">
            <div className="h-11 flex items-center">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={!!form.auto_subscribe_ack}
                onChange={(e) => set('auto_subscribe_ack', e.target.checked)}
              />
            </div>
          </Field>
        </div>
      </section>

      {/* いったん JSON 入力（将来はUI化） */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-5 mt-5">
        <Field label="希望時間帯（JSON / 省略可）">
          <textarea
            className="w-full min-h-[96px] border border-gray-300 rounded-lg px-3 py-2"
            placeholder={`例) { "fri": ["19:00","21:00"], "sat": ["19:00"] }`}
            value={form.preferred_slots_text}
            onChange={(e) => set('preferred_slots_text', e.target.value)}
          />
          <p className="text-gray-500 text-xs">
            ※ UI は後で作り込みます。今は有効な JSON で保存できます。
          </p>
        </Field>

        <Field label="重みづけ（JSON / 省略可）">
          <textarea
            className="w-full min-h-[96px] border border-gray-300 rounded-lg px-3 py-2"
            placeholder={`例) { "age": 0.6, "area": 0.3, "style": 0.1 }`}
            value={form.priority_weights_text}
            onChange={(e) => set('priority_weights_text', e.target.value)}
          />
        </Field>
      </section>

      {/* トースト */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-20 z-50
                        bg-black text-white text-sm px-4 py-2 rounded-lg shadow">
          {toast}
        </div>
      )}

      {/* 固定フッター保存 */}
      <div className="fixed inset-x-0 bottom-0 bg-white/80 backdrop-blur border-t border-gray-100 p-4">
        <button
          className="w-full h-12 rounded-xl bg-black text-white font-semibold disabled:opacity-60"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? '保存中…' : '保存する'}
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

function safeJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null; // バックエンド側も null 許容
  }
}