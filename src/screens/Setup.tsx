// src/screens/Setup.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  getMe,
  getSetup,
  saveSetup,
  type SetupDTO,
  type CandidateSlot,
} from '../api';
import { useNavigate } from 'react-router-dom';

type Props = { defaultMode?: 'solo' | 'friends' };

// 当週＋次週の金/土 × 19:00/21:00 を生成（JST前提）
function getNextTwoWeeksFriSatSlots(now = new Date()): CandidateSlot[] {
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const start = new Date(
    Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate())
  );
  const slots: CandidateSlot[] = [];
  for (let d = 0; d < 14; d++) {
    const dt = new Date(start.getTime() + d * 24 * 60 * 60 * 1000);
    const w = dt.getUTCDay(); // 5=Fri, 6=Sat
    if (w === 5 || w === 6) {
      const yyyy = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      const date = `${yyyy}-${mm}-${dd}`;
      slots.push({ date, time: '19:00' }, { date, time: '21:00' });
    }
  }
  return slots;
}

// 締切: スロット日時の 2日前 20:00 JST
function isPastDeadline(slot: CandidateSlot, now = new Date()): boolean {
  const slotDt = new Date(`${slot.date}T${slot.time}:00+09:00`);
  const deadline = new Date(slotDt.getTime() - 2 * 24 * 60 * 60 * 1000);
  deadline.setHours(20, 0, 0, 0); // 2日前 20:00 JST
  return now.getTime() > deadline.getTime();
}

export default function Setup({ defaultMode }: Props) {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('unknown');

  // 入力モデル
  const [typeMode, setTypeMode] =
    useState<SetupDTO['type_mode']>('wine_talk');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [cost, setCost] =
    useState<SetupDTO['cost_pref']>('men_pay_all');

  // 見た目統一（v2.6は固定運用）
  const [venueUi, setVenueUi] =
    useState<'service_fixed'>('service_fixed');
  const [locationUi, setLocationUi] =
    useState<'shibuya_shinjuku'>('shibuya_shinjuku');

  // ルート別デフォルト
  useEffect(() => {
    if (defaultMode === 'friends') {
      // 参加形態の差分を将来ここで扱う
    }
  }, [defaultMode]);

  // 性別取得（費用選択肢の出し分けに使用）
  useEffect(() => {
    (async () => {
      try {
        const r = await getMe(); // { userId, gender? }
        const g = (r?.gender as any) || 'unknown';
        setGender(g === 'male' || g === 'female' ? g : 'unknown');
      } catch {
        // 失敗しても画面は表示
      }
    })();
  }, []);

  // 既存設定のロード
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await getSetup(); // { setup: SetupDTO | null }
        if (r?.setup) {
          const s: SetupDTO = r.setup;
          setTypeMode(s.type_mode ?? 'wine_talk');
          const map: Record<string, boolean> = {};
          for (const sl of s.candidate_slots || []) {
            map[`${sl.date} ${sl.time}`] = true;
          }
          setSelected(map);
          if (s.cost_pref) setCost(s.cost_pref);
          if (s.location) setLocationUi(s.location);
          // venue_pref は v2.6 固定
        }
      } catch (e) {
        console.warn('[setup] load failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grid = useMemo(() => getNextTwoWeeksFriSatSlots(), []);
  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  const toggle = (key: string, sl?: CandidateSlot) => {
    if (sl && isPastDeadline(sl)) return; // ガード
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  async function onSave() {
    if (saving) return;
    if (selectedCount < 1)
      return alert('少なくとも1枠を選択してください。');

    setSaving(true);
    try {
      const candidate_slots: CandidateSlot[] = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => {
          const [date, time] = k.split(' ');
          return { date, time: time as '19:00' | '21:00' };
        })
        // 重複排除
        .reduce((acc, cur) => {
          const key = `${cur.date} ${cur.time}`;
          if (!acc.some((x) => `${x.date} ${x.time}` === key)) acc.push(cur);
          return acc;
        }, [] as CandidateSlot[])
        // 並び順固定
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

      const payload: SetupDTO = {
        type_mode: typeMode,
        candidate_slots,
        location: locationUi, // v2.6では固定
        venue_pref: null, // v2.6は固定
        cost_pref: cost,
      };

      await saveSetup(payload);
      alert('保存しました');
      nav('/mypage');
    } catch (e: any) {
      const msg = (e?.message ?? 'unknown error').replace(
        'failed:',
        'サーバエラー:'
      );
      alert('保存に失敗しました: ' + msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return <div className="p-6 text-gray-600">読み込み中…</div>;

  return (
    <div className="max-w-screen-sm mx-auto p-4 space-y-6 bg-white text-gray-900">
      <h1 className="text-xl font-semibold">合コンの条件を入力</h1>

      {/* 会のタイプ */}
      <section className="bg-white text-gray-900 rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 space-y-3">
        <div className="font-medium">会のタイプ</div>
        <div className="grid grid-cols-1 gap-3">
          <label className="flex items-center gap-3 text-gray-800">
            <input
              type="radio"
              name="type_mode"
              checked={typeMode === 'wine_talk'}
              onChange={() => setTypeMode('wine_talk')}
            />
            <span>ワインの話をしたい</span>
          </label>
          <label className="flex items-center gap-3 text-gray-800">
            <input
              type="radio"
              name="type_mode"
              checked={typeMode === 'wine_and_others'}
              onChange={() => setTypeMode('wine_and_others')}
            />
            <span>ワイン以外の話もしたい</span>
          </label>
        </div>
      </section>

      {/* 日時（当週・次週の金/土 × 19:00/21:00） */}
      <section className="bg-white text-gray-900 rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 space-y-3">
        <div className="font-medium">参加できる日時（複数選択可）</div>
        <div className="grid grid-cols-2 gap-2">
          {grid.map((sl) => {
            const key = `${sl.date} ${sl.time}`;
            const disabled = isPastDeadline(sl);
            const active = !!selected[key];
            return (
              <button
                key={key}
                disabled={disabled}
                onClick={() => toggle(key, sl)}
                aria-pressed={active}
                className={[
                  'h-12 rounded-lg border text-sm px-3 text-left',
                  active
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-900 border-gray-300',
                  disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:ring-2 hover:ring-black/10',
                ].join(' ')}
                title={
                  disabled ? '締切（2日前20:00）を過ぎています' : ''
                }
              >
                <div className="font-medium">
                  {sl.date}（
                  {
                    '日月火水木金土'[
                      new Date(`${sl.date}T00:00:00+09:00`).getDay()
                    ]
                  }
                  ）
                </div>
                <div>{sl.time} 開始</div>
              </button>
            );
          })}
        </div>
        <div className="text-right text-sm text-gray-500">
          ※ 締切：各枠の2日前 20:00
        </div>
      </section>

      {/* 費用方針（性別で選択肢が異なる） */}
      <section className="bg-white text-gray-900 rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 space-y-3">
        <div className="font-medium">費用の方針</div>
        <div className="grid grid-cols-1 gap-3">
          <label className="flex items-center gap-3 text-gray-800">
            <input
              type="radio"
              name="cost"
              checked={cost === 'men_pay_all'}
              onChange={() => setCost('men_pay_all')}
            />
            <span>男性が支払う</span>
          </label>

          {gender === 'male' && (
            <label className="flex items-center gap-3 text-gray-800">
              <input
                type="radio"
                name="cost"
                checked={cost === 'split_even'}
                onChange={() => setCost('split_even')}
              />
              <span>全員で割り勘</span>
            </label>
          )}

          {gender === 'female' && (
            <label className="flex items-center gap-3 text-gray-800">
              <input
                type="radio"
                name="cost"
                checked={cost === 'follow_partner'}
                onChange={() => setCost('follow_partner')}
              />
              <span>相手に合わせる</span>
            </label>
          )}
        </div>
      </section>

      {/* お店の希望（ラジオ1択） */}
      <section className="bg-white text-gray-900 rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 space-y-3">
        <div className="font-medium">お店の希望</div>
        <label className="flex items-center gap-3 text-gray-800">
          <input
            type="radio"
            name="venue_pref"
            checked={venueUi === 'service_fixed'}
            onChange={() => setVenueUi('service_fixed')}
          />
          <span>サービス側で指定</span>
        </label>
        <div className="text-xs text-gray-500">
          ※ v2.6では固定運用。将来選択式に拡張予定。
        </div>
      </section>

      {/* 場所（ラジオ1択） */}
      <section className="bg-white text-gray-900 rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 space-y-3">
        <div className="font-medium">場所</div>
        <label className="flex items-center gap-3 text-gray-800">
          <input
            type="radio"
            name="location"
            checked={locationUi === 'shibuya_shinjuku'}
            onChange={() => setLocationUi('shibuya_shinjuku')}
          />
          <span>渋谷・新宿エリア</span>
        </label>
      </section>

      <div className="pt-2">
        <button
          onClick={onSave}
          disabled={saving || selectedCount < 1}
          className="h-11 px-5 rounded-lg bg-black text-white disabled:bg-gray-400"
        >
          {saving ? '保存中…' : 'この条件で保存する'}
        </button>
        <div className="text-sm text-gray-500 mt-2">
          少なくとも1枠以上の日時を選択してください
        </div>
      </div>
    </div>
  );
}