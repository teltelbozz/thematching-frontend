import { useEffect, useState } from 'react';
import { whenAuthReady } from './liff';
import { getPrefs, savePrefs, getSetup, saveSetup } from './api';

type Props = { onJoined?: () => void | Promise<void> };
type Prefs = {
  participation_style?: 'solo'|'with_friend';
  party_size?: number;
  type_mode?: 'talk'|'play'|'either';
  venue_pref?: 'cheap_izakaya'|'fancy_dining'|'bar_cafe';
  cost_pref?: 'men_pay_all'|'split_even'|'follow_partner';
};
type Setup = Prefs & { desired_date?: string };

export default function Setup({ onJoined }: Props){
  const [prefs, setPrefs] = useState<Prefs>({ participation_style:'solo', type_mode:'either', venue_pref:'cheap_izakaya', cost_pref:'split_even', party_size:1 });
  const [setup, setSetup] = useState<Setup>({ desired_date:'' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|undefined>();

  useEffect(()=>{
    (async ()=>{
      try{
        await whenAuthReady();
        const p = await getPrefs().catch(()=>null);
        if (p?.prefs) setPrefs(p.prefs);
        const s = await getSetup().catch(()=>null);
        if (s?.setup) setSetup(s.setup);
      }catch(e:any){
        console.error('[Setup] init failed', e);
        setError(e?.message || String(e));
      }finally{
        setLoading(false);
      }
    })();
  },[]);

  async function handleSave(){
    try{
      await savePrefs(prefs);
      await saveSetup(setup);
      alert('保存しました！');
      await onJoined?.();
    }catch(e:any){
      alert('保存に失敗: ' + (e?.message || String(e)));
    }
  }

  if (loading) return <div className="safe">読み込み中...</div>;
  if (error) return <div className="safe" style={{color:'#e87d7d'}}>エラー: {error}</div>;

  return (
    <div className="safe">
      <div className="menu-title">合コン設定</div>

      <div style={{display:'grid', gap:12}}>
        <label>
          参加スタイル：
          <select value={prefs.participation_style} onChange={e=>setPrefs({...prefs, participation_style: e.target.value as any})}>
            <option value="solo">一人で参加</option>
            <option value="with_friend">友達と参加</option>
          </select>
        </label>

        <label>
          人数：
          <input type="number" min={1} max={4} value={prefs.party_size ?? 1} onChange={e=>setPrefs({...prefs, party_size: Number(e.target.value)})} />
        </label>

        <label>
          合コンの種類：
          <select value={prefs.type_mode} onChange={e=>setPrefs({...prefs, type_mode: e.target.value as any})}>
            <option value="either">どちらでも良い</option>
            <option value="talk">話す（居酒屋/ダイニング）</option>
            <option value="play">遊ぶ（シーシャ/ダーツ）</option>
          </select>
        </label>

        <label>
          お店について：
          <select value={prefs.venue_pref} onChange={e=>setPrefs({...prefs, venue_pref: e.target.value as any})}>
            <option value="cheap_izakaya">安ウマ居酒屋</option>
            <option value="fancy_dining">お洒落ダイニング</option>
            <option value="bar_cafe">BAR/夜カフェ</option>
          </select>
        </label>

        <label>
          合コン費用：
          <select value={prefs.cost_pref} onChange={e=>setPrefs({...prefs, cost_pref: e.target.value as any})}>
            <option value="split_even">全員で割り勘がいい</option>
            <option value="men_pay_all">男性が全て払う</option>
            <option value="follow_partner">相手に合わせる</option>
          </select>
        </label>

        <label>
          合コン参加日：
          <input type="date" value={setup.desired_date || ''} onChange={e=>setSetup({...setup, desired_date: e.target.value})} />
        </label>

        <button className="tile" style={{height:48}} onClick={handleSave}>条件を保存</button>
      </div>
    </div>
  );
}
