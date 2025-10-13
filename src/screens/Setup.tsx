// src/screens/Setup.tsx
import { useEffect, useState } from 'react';
import { whenAuthReady } from '../liff';
import { getSetup, saveSetup } from '../api';
import { useNavigate } from 'react-router-dom';

// 簡易的な型（API 仕様はバックエンド側に合わせて適宜拡張）
type SetupData = {
  style?: 'solo' | 'friends';
  date?: string; // YYYY-MM-DD
  preferences?: {
    type?: 'talk' | 'play' | 'either';
    venue?: 'izakaya' | 'dining' | 'bar';
    cost?: 'men_pay' | 'split' | 'follow';
  };
};

export default function Setup() {
  const nav = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [style, setStyle] = useState<SetupData['style']>('solo');
  const [date, setDate] = useState<string>('');
  const [type, setType] = useState<SetupData['preferences']['type']>('either');
  const [venue, setVenue] = useState<SetupData['preferences']['venue']>('izakaya');
  const [cost, setCost] = useState<SetupData['preferences']['cost']>('split');

  useEffect(() => {
    (async () => {
      try {
        await whenAuthReady();
        const data = (await getSetup()) as SetupData;
        if (data?.style) setStyle(data.style);
        if (data?.date) setDate(data.date);
        if (data?.preferences?.type) setType(data.preferences.type);
        if (data?.preferences?.venue) setVenue(data.preferences.venue);
        if (data?.preferences?.cost) setCost(data.preferences.cost);
      } catch (e: any) {
        // 初回は未登録のことも多いので致命扱いにしない
        console.warn('[setup] get failed:', e?.message);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function onSave() {
    try {
      setSaving(true);
      setErr(null);
      const payload: SetupData = {
        style,
        date,
        preferences: { type, venue, cost },
      };
      await saveSetup(payload);
      // 保存後はマイページに戻る
      nav('/mypage', { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? '合コン設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div style={page}>
        <h1 style={title}>合コン設定</h1>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={page}>
      <h1 style={title}>合コン設定</h1>
      {err && <p style={errorBox}>{err}</p>}

      {/* 参加スタイル */}
      <section style={section}>
        <h2 style={h2}>参加スタイル</h2>
        <div style={radioRow}>
          <label><input type="radio" name="style" checked={style==='solo'} onChange={()=>setStyle('solo')} /> 一人で参加</label>
          <label><input type="radio" name="style" checked={style==='friends'} onChange={()=>setStyle('friends')} /> 友達と参加</label>
        </div>
      </section>

      {/* 参加日 */}
      <section style={section}>
        <h2 style={h2}>合コン参加日</h2>
        <input
          type="date"
          value={date}
          onChange={(e)=>setDate(e.target.value)}
          style={input}
        />
        <p style={{ color:'#64748b', fontSize:13, marginTop:8 }}>※ 人気日はアプリ上で「人気日」表示予定</p>
      </section>

      {/* 希望条件 */}
      <section style={section}>
        <h2 style={h2}>希望の条件（保存可）</h2>

        <div style={formRow}>
          <label style={label}>どんな合コンがいい？</label>
          <select value={type} onChange={(e)=>setType(e.target.value as any)} style={input}>
            <option value="talk">話す（居酒屋/ダイニング）</option>
            <option value="play">遊ぶ（シーシャ/ダーツ）</option>
            <option value="either">どちらでも良い</option>
          </select>
        </div>

        <div style={formRow}>
          <label style={label}>お店について</label>
          <select value={venue} onChange={(e)=>setVenue(e.target.value as any)} style={input}>
            <option value="izakaya">安ウマ居酒屋</option>
            <option value="dining">お洒落ダイニング</option>
            <option value="bar">BAR / 夜カフェ</option>
          </select>
        </div>

        <div style={formRow}>
          <label style={label}>合コン費用</label>
          <select value={cost} onChange={(e)=>setCost(e.target.value as any)} style={input}>
            <option value="men_pay">男性が全て払う</option>
            <option value="split">全員で割り勘がいい</option>
            <option value="follow">相手に合わせる</option>
          </select>
        </div>
      </section>

      <div style={{ marginTop: 24 }}>
        <button style={primaryBtn} onClick={onSave} disabled={saving}>
          {saving ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
  );
}

const page: React.CSSProperties = { padding: 16, maxWidth: 560, margin: '0 auto' };
const title: React.CSSProperties = { fontSize: 22, fontWeight: 800, margin: '0 0 16px' };
const section: React.CSSProperties = { marginBottom: 20 };
const h2: React.CSSProperties = { fontSize: 16, fontWeight: 800, margin: '0 0 8px' };
const radioRow: React.CSSProperties = { display:'flex', gap: 16, color:'#334155', fontSize:15 };
const formRow: React.CSSProperties = { display:'flex', flexDirection:'column', gap: 8, marginBottom: 12 };
const label: React.CSSProperties = { fontSize: 14, color:'#475569', fontWeight: 700 };
const input: React.CSSProperties = { padding:'12px 14px', border:'1px solid #e5e7eb', borderRadius:12, fontSize:16 };
const primaryBtn: React.CSSProperties = { padding:'12px 16px', borderRadius:12, background:'#0ea5e9', color:'#fff', border:'none', fontWeight:700, cursor:'pointer', width:'100%' };
const errorBox: React.CSSProperties = { background:'#fee2e2', color:'#991b1b', padding:'8px 12px', borderRadius:8, marginBottom:12, fontSize:14 };