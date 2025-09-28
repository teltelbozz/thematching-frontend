import { useEffect, useMemo, useState } from 'react';
import { getPrefs, updatePrefs, getPopularDays, getSlotsByDate, joinSlot } from './api';

type Prefs = {
  participation_style?: 'solo' | 'with_friend';
  party_size?: number;
  type_mode?: 'talk' | 'play' | 'either';
  venue_pref?: 'cheap_izakaya' | 'fancy_dining' | 'bar_cafe';
  cost_pref?: 'men_pay_all' | 'split_even' | 'follow_partner';
  saved_dates?: string[];
};

export default function Setup({ onJoined }: { onJoined: (roomId?: string) => void }) {
  const [prefs, setPrefs] = useState<Prefs>({});
  const [date, setDate] = useState<string>('');
  const [popular, setPopular] = useState<{day: string; slot_count: number}[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [err, setErr] = useState<string>();

  useEffect(() => {
    (async () => {
      try {
        const p = await getPrefs();
        if (p.prefs) setPrefs(p.prefs);
        const pop = await getPopularDays();
        setPopular(pop.days || []);
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  const isPopular = useMemo(() => new Set(popular.map(d => d.day)), [popular]);

  const save = async () => {
    setErr(undefined);
    try {
      const input: Prefs = { ...prefs };
      if (date) {
        const arr = new Set(input.saved_dates || []);
        arr.add(date);
        input.saved_dates = Array.from(arr);
      }
      const res = await updatePrefs(input);
      setPrefs(res.prefs);
      if (date) {
        const s = await getSlotsByDate(date);
        setSlots(s);
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  const doJoin = async (id: string | number) => {
    setErr(undefined);
    try {
      await joinSlot(id);
      // 簡易: join の後は親に通知（実際は /matches やチャット遷移など）
      onJoined(undefined);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8, marginTop: 16 }}>
      <h2>合コン設定</h2>
      {err && <div style={{ color: 'crimson' }}>{err}</div>}

      <div style={{ display: 'grid', gap: 8, maxWidth: 460 }}>
        <label>参加スタイル
          <select
            value={prefs.participation_style || 'solo'}
            onChange={e => setPrefs(p => ({ ...p, participation_style: e.target.value as any }))}>
            <option value="solo">一人で参加</option>
            <option value="with_friend">友達と参加</option>
          </select>
        </label>

        {prefs.participation_style === 'with_friend' && (
          <label>人数
            <input type="number" min={2} max={4}
              value={prefs.party_size || 2}
              onChange={e => setPrefs(p => ({ ...p, party_size: Number(e.target.value) }))} />
          </label>
        )}

        <label>合コンの種類
          <select
            value={prefs.type_mode || 'either'}
            onChange={e => setPrefs(p => ({ ...p, type_mode: e.target.value as any }))}>
            <option value="talk">話す（居酒屋/ダイニング）</option>
            <option value="play">遊ぶ（シーシャ/ダーツ）</option>
            <option value="either">どちらでも良い</option>
          </select>
        </label>

        <label>お店について
          <select
            value={prefs.venue_pref || 'cheap_izakaya'}
            onChange={e => setPrefs(p => ({ ...p, venue_pref: e.target.value as any }))}>
            <option value="cheap_izakaya">安ウマ居酒屋</option>
            <option value="fancy_dining">お洒落ダイニング</option>
            <option value="bar_cafe">BAR/夜カフェ</option>
          </select>
        </label>

        <label>合コン費用
          <select
            value={prefs.cost_pref || 'split_even'}
            onChange={e => setPrefs(p => ({ ...p, cost_pref: e.target.value as any }))}>
            <option value="men_pay_all">男性が全て払う</option>
            <option value="split_even">全員で割り勘がいい</option>
            <option value="follow_partner">相手に合わせる</option>
          </select>
        </label>

        <label>合コン参加日（YYYY-MM-DD）
          <input
            placeholder="2025-09-25"
            value={date}
            onChange={e => setDate(e.target.value)} />
          {date && isPopular.has(date) && (
            <span style={{ marginLeft: 8, color: '#d97706' }}>★人気日</span>
          )}
        </label>

        <button onClick={save}>条件を保存して、この日のスロットを検索</button>
      </div>

      {slots.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div><b>この日のスロット:</b></div>
          <ul>
            {slots.map((s: any) => (
              <li key={s.id} style={{ margin: '6px 0' }}>
                <span>#{s.id} {s.title} {new Date(s.date_time).toLocaleString()}</span>
                <button style={{ marginLeft: 8 }} onClick={() => doJoin(s.id)}>参加する</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}