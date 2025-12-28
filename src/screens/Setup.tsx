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

function isPastDeadline(slot: CandidateSlot, now = new Date()): boolean {
  const slotDt = new Date(`${slot.date}T${slot.time}:00+09:00`);
  const deadline = new Date(slotDt.getTime() - 2 * 24 * 60 * 60 * 1000);
  deadline.setHours(20, 0, 0, 0);
  return now.getTime() > deadline.getTime();
}

function inferNeedsKyc(me: any): boolean {
  if (!me || typeof me !== 'object') return false;

  if (me.needsKyc === true) return true;
  if (me.needsKycVerification === true) return true;
  if (me.kycRequired === true) return true;

  if (me.kycCompleted === false) return true;
  if (me.isKycVerified === false) return true;

  const st = me.kycStatus;
  if (typeof st === 'string' && st) {
    const s = st.toLowerCase();
    if (s !== 'approved' && s !== 'verified' && s !== 'completed') return true;
  }

  return false;
}

export default function Setup({ defaultMode }: Props) {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('unknown');

  const [gateMsg, setGateMsg] = useState<string>('');

  const [typeMode, setTypeMode] = useState<SetupDTO['type_mode']>('wine_talk');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [cost, setCost] = useState<SetupDTO['cost_pref']>('men_pay_all');

  const [venueUi, setVenueUi] = useState<'service_fixed'>('service_fixed');
  const [locationUi, setLocationUi] = useState<'shibuya_shinjuku'>('shibuya_shinjuku');

  useEffect(() => {
    if (defaultMode === 'friends') {
      // 参加形態の差分を将来ここで扱う
    }
  }, [defaultMode]);

  useEffect(() => {
    (async () => {
      try {
        const r = await getMe();
        const g = (r?.gender as any) || 'unknown';
        setGender(g === 'male' || g === 'female' ? g : 'unknown');
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await getSetup();
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
    if (sl && isPastDeadline(sl)) return;
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  async function onSave() {
    if (saving) return;
    setGateMsg('');

    if (selectedCount < 1) {
      alert('少なくとも1枠を選択してください。');
      return;
    }

    try {
      const me = await getMe().catch(() => null);

      if (!me?.hasProfile) {
        const m = 'ユーザ登録してください（プロフィール登録が未完了です）';
        setGateMsg(m);
        alert(m);
        return;
      }

      const needsKyc = inferNeedsKyc(me);
      if (needsKyc) {
        const m = '本人確認を完了してください（KYC未完了のため保存できません）';
        setGateMsg(m);
        alert(m);
        return;
      }
    } catch {
      // 失敗してもブロックしない（デグレ回避）
    }

    setSaving(true);
    try {
      const candidate_slots: CandidateSlot[] = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => {
          const [date, time] = k.split(' ');
          return { date, time: time as '19:00' | '21:00' };
        })
        .reduce((acc, cur) => {
          const key = `${cur.date} ${cur.time}`;
          if (!acc.some((x) => `${x.date} ${x.time}` === key)) acc.push(cur);
          return acc;
        }, [] as CandidateSlot[])
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

      const payload: SetupDTO = {
        type_mode: typeMode,
        candidate_slots,
        location: locationUi,
        venue_pref: null,
        cost_pref: cost,
      };

      await saveSetup(payload);
      alert('保存しました');
      nav('/mypage');
    } catch (e: any) {
      const msg = (e?.message ?? 'unknown error').replace('failed:', 'サーバエラー:');
      alert('保存に失敗しました: ' + msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-600">読み込み中…</div>;

  return (
    <div className="max-w-screen-sm mx-auto p-4 space-y-6 bg-white text-gray-900">
      <h1 className="text-xl font-semibold">合コンの条件を入力</h1>

      {!!gateMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {gateMsg}
        </div>
      )}

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
                  active ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-300',
                  disabled ? 'opacity-40 cursor-not-allowed' : 'hover:ring-2 hover:ring-black/10',
                ].join(' ')}
                title={disabled ? '締切（2日前20:00）を過ぎています' : ''}
              >
                <div className="font-medium">
                  {sl.date}（{'日月火水木金土'[new Date(`${sl.date}T00:00:00+09:00`).getDay()]}）
                </div>
                <div>{sl.time} 開始</div>
              </button>
            );
          })}
        </div>
        <div className="text-right text-sm text-gray-500">※ 締切：各枠の2日前 20:00</div>
      </section>

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
        <div className="text-xs text-gray-500">※ v2.6では固定運用。将来選択式に拡張予定。</div>
      </section>

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