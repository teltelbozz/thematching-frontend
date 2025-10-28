// src/screens/MatchPrefs.tsx
import { useEffect, useState } from 'react';
import { getAccessToken } from '../api';

/** 選択肢（プレースホルダーの例をそのまま採用） */
const PURPOSE_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: 'friend', label: 'ワイワイ（友達づくり）' },
  { value: 'dating', label: '恋人探し（彼女/彼氏）' },
  { value: 'party', label: 'とにかく盛り上がりたい' },
  { value: 'serious', label: '真剣（婚活寄り）' },
];

const GENDER_OPTIONS = [
  { value: '', label: '指定なし' },
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'any', label: 'どちらでも' },
];

const PERSONALITY_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: '明るい盛り上げタイプ', label: '明るい盛り上げタイプ' },
  { value: '落ち着いた聞き役タイプ', label: '落ち着いた聞き役タイプ' },
  { value: 'ムードメーカー', label: 'ムードメーカー' },
];

const ATMOSPHERE_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: 'クールなエリート系', label: 'クールなエリート系' },
  { value: '親しみやすい癒し系', label: '親しみやすい癒し系' },
  { value: 'おしゃれでスマート', label: 'おしゃれでスマート' },
];

const STYLE_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: '話す中心', label: '話す中心（the4：話す）' },
  { value: '遊ぶ中心', label: '遊ぶ中心（the4：遊ぶ）' },
  { value: 'カジュアル', label: 'カジュアル（wine）' },
  { value: 'ガチ', label: 'ガチ（wine）' },
];

const AREA_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: '恵比寿', label: '恵比寿（the4既定）' },
  { value: '渋谷', label: '渋谷' },
  { value: '新宿', label: '新宿' },
];

const VENUE_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: '居酒屋', label: '居酒屋' },
  { value: 'おしゃれダイニング', label: 'おしゃれダイニング' },
  { value: 'bar', label: 'Bar' },
];

const PAY_POLICY_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: 'male_pays', label: '男性が全て払う（マッチングアップ）' },
  { value: 'split', label: '割り勘' },
  { value: 'flex', label: '相手/状況に合わせる' },
];

type Prefs = {
  purpose: string | null;
  partner_age_min: number | null;
  partner_age_max: number | null;
  partner_gender: string | null;
  partner_personality_tags: string[]; // 便宜上、単一選択でも配列で保持（APIが配列のため）
  partner_atmosphere_tags: string[];
  partner_style_tags: string[];
  preferred_slots: any | null;  // 未来拡張（今回は未使用）
  areas: string[];              // 単一選択でも配列で送る
  venue_types: string[];        // 単一選択でも配列で送る
  pay_policy: string | null;
  party_size: number;
  allow_friends: boolean;
  use_intro_free: boolean;
  auto_subscribe_ack: boolean;
  priority_weights: any | null; // 未来拡張
};

const DEFAULT_PREFS: Prefs = {
  purpose: null,
  partner_age_min: null,
  partner_age_max: null,
  partner_gender: 'any',
  partner_personality_tags: [],
  partner_atmosphere_tags: [],
  partner_style_tags: [],
  preferred_slots: null,
  areas: [],
  venue_types: [],
  pay_policy: 'flex',
  party_size: 1,
  allow_friends: true,
  use_intro_free: false,
  auto_subscribe_ack: false,
  priority_weights: null,
};

export default function MatchPrefs() {
  const [form, setForm] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 便利ヘルパ
  const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '';

  // 初期ロード
  useEffect(() => {
    (async () => {
      try {
        const token = getAccessToken();
        const r = await fetch(`${API_BASE}/match-prefs`, {
          method: 'GET',
          credentials: 'include',
          headers: token ? { Authorization: 'Bearer ' + token } : {},
        });
        if (!r.ok) throw new Error(`/match-prefs GET failed: ${r.status}`);
        const j = await r.json();
        const p = (j?.prefs || {}) as Partial<Prefs>;

        setForm({
          ...DEFAULT_PREFS,
          ...p,
          // 後方互換・null調整
          partner_gender: (p.partner_gender ?? 'any') as any,
          party_size: p.party_size ?? 1,
          partner_personality_tags: Array.isArray(p.partner_personality_tags)
            ? p.partner_personality_tags
            : [],
          partner_atmosphere_tags: Array.isArray(p.partner_atmosphere_tags)
            ? p.partner_atmosphere_tags
            : [],
          partner_style_tags: Array.isArray(p.partner_style_tags)
            ? p.partner_style_tags
            : [],
          areas: Array.isArray(p.areas) ? p.areas : [],
          venue_types: Array.isArray(p.venue_types) ? p.venue_types : [],
        });
      } catch (e) {
        console.warn('[MatchPrefs] load failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [API_BASE]);

  // 保存
  async function onSave() {
    try {
      setSaving(true);

      // 単一選択 → 配列化して API に合わせる
      const payload = {
        ...form,
        partner_personality_tags:
          form.partner_personality_tags?.length ? form.partner_personality_tags : [],
        partner_atmosphere_tags:
          form.partner_atmosphere_tags?.length ? form.partner_atmosphere_tags : [],
        partner_style_tags:
          form.partner_style_tags?.length ? form.partner_style_tags : [],
        areas: form.areas?.length ? form.areas : [],
        venue_types: form.venue_types?.length ? form.venue_types : [],
      };

      const token = getAccessToken();
      const r = await fetch(`${API_BASE}/match-prefs`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`/match-prefs PUT failed: ${r.status}`);

      // ✅ トースト表示（3秒で消える）
      setToast('保存しました');
      window.setTimeout(() => setToast(null), 3000);
    } catch (e) {
      console.error('[MatchPrefs] save failed', e);
      setToast('保存に失敗しました');
      window.setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-600">読み込み中…</div>;

  // 単一選択に揃えるための現在値（配列の先頭を使う）
  const selectedPersonality = form.partner_personality_tags[0] ?? '';
  const selectedAtmosphere = form.partner_atmosphere_tags[0] ?? '';
  const selectedStyle = form.partner_style_tags[0] ?? '';
  const selectedArea = form.areas[0] ?? '';
  const selectedVenue = form.venue_types[0] ?? '';

  return (
    <div className="max-w-md mx-auto px-5 pb-28 pt-4">
      <h1 className="text-2xl font-bold tracking-tight text-center mb-6">
        希望条件の設定
      </h1>

      {/* カード: 目的・相手条件 */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-5">
        <Field label="目的">
          <select
            className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
            value={form.purpose ?? ''}
            onChange={(e) => set('purpose', e.target.value || null)}
          >
            {PURPOSE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="相手の年齢（最小）">
            <input
              className="w-full h-11 border border-gray-300 rounded-lg px-3"
              type="number"
              min={18}
              max={80}
              value={form.partner_age_min ?? ''}
              onChange={(e) =>
                set(
                  'partner_age_min',
                  e.target.value === '' ? null : Math.max(18, Math.min(80, Number(e.target.value))),
                )
              }
              placeholder="20"
            />
          </Field>
          <Field label="相手の年齢（最大）">
            <input
              className="w-full h-11 border border-gray-300 rounded-lg px-3"
              type="number"
              min={18}
              max={80}
              value={form.partner_age_max ?? ''}
              onChange={(e) =>
                set(
                  'partner_age_max',
                  e.target.value === '' ? null : Math.max(18, Math.min(80, Number(e.target.value))),
                )
              }
              placeholder="30"
            />
          </Field>
        </div>

        <Field label="相手の性別">
          <select
            className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
            value={form.partner_gender ?? ''}
            onChange={(e) => set('partner_gender', e.target.value || 'any')}
          >
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="相手の性格">
          <select
            className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
            value={selectedPersonality}
            onChange={(e) => set('partner_personality_tags', e.target.value ? [e.target.value] : [])}
          >
            {PERSONALITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="相手の雰囲気">
          <select
            className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
            value={selectedAtmosphere}
            onChange={(e) => set('partner_atmosphere_tags', e.target.value ? [e.target.value] : [])}
          >
            {ATMOSPHERE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="相手のスタイル">
          <select
            className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
            value={selectedStyle}
            onChange={(e) => set('partner_style_tags', e.target.value ? [e.target.value] : [])}
          >
            {STYLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </section>

      {/* カード: 場所・費用・人数 */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-5 space-y-5 mt-5">
        <Field label="希望エリア">
          <select
            className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
            value={selectedArea}
            onChange={(e) => set('areas', e.target.value ? [e.target.value] : [])}
          >
            {AREA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="希望ジャンル">
          <select
            className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
            value={selectedVenue}
            onChange={(e) => set('venue_types', e.target.value ? [e.target.value] : [])}
          >
            {VENUE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="支払いポリシー">
          <select
            className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
            value={form.pay_policy ?? ''}
            onChange={(e) => set('pay_policy', e.target.value || null)}
          >
            {PAY_POLICY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="人数（自分側の参加人数）">
            <input
              className="w-full h-11 border border-gray-300 rounded-lg px-3"
              type="number"
              min={1}
              max={4}
              value={form.party_size ?? 1}
              onChange={(e) =>
                set('party_size', Math.max(1, Math.min(4, Number(e.target.value || 1))))
              }
            />
          </Field>

          <Field label="友達招待OK">
            <select
              className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white"
              value={form.allow_friends ? '1' : '0'}
              onChange={(e) => set('allow_friends', e.target.value === '1')}
            >
              <option value="1">OK</option>
              <option value="0">NG</option>
            </select>
          </Field>
        </div>
      </section>

      {/* トースト */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 bg-black text-white text-sm px-4 py-2 rounded-lg shadow">
          {toast}
        </div>
      )}

      {/* 固定フッター風ボタン */}
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