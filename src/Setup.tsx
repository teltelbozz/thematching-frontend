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
type SetupT = Prefs & { desired_date?: string };

export default function Setup({ onJoined }: Props){
  const [prefs, setPrefs] = useState<Prefs>({ participation_style:'solo', type_mode:'either', venue_pref:'cheap_izakaya', cost_pref:'split_even', party_size:1 });
  const [setup, setSetup] = useState<SetupT>({ desired_date:'' });
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

  return (
    <div className="safe">
      <h1 className="page-title">合コン設定</h1>

      {loading && <div className="text-muted">読み込み中...</div>}
      {error && <div style={{color:'#e87d7d'}}>エラー: {error}</div>}

      <div className="card" style={{marginTop: 12}}>
        <div className="form">
          <div className="field">
            <div className="field-label">参加スタイル</div>
            <select
              value={prefs.participation_style}
              onChange={e=>setPrefs({...prefs, participation_style: e.target.value as any})}
            >
              <option value="solo">一人で参加</option>
              <option value="with_friend">友達と参加</option>
            </select>
          </div>

          <div className="field">
            <div className="field-label">人数</div>
            <input
              type="number" min={1} max={4}
              value={prefs.party_size ?? 1}
              onChange={e=>setPrefs({...prefs, party_size: Number(e.target.value)})}
            />
          </div>

          <div className="field">
            <div className="field-label">合コンの種類</div>
            <select
              value={prefs.type_mode}
              onChange={e=>setPrefs({...prefs, type_mode: e.target.value as any})}
            >
              <option value="either">どちらでも良い</option>
              <option value="talk">話す（居酒屋/ダイニング）</option>
              <option value="play">遊ぶ（シーシャ/ダーツ）</option>
            </select>
          </div>

          <div className="field">
            <div className="field-label">お店について</div>
            <select
              value={prefs.venue_pref}
              onChange={e=>setPrefs({...prefs, venue_pref: e.target.value as any})}
            >
              <option value="cheap_izakaya">安ウマ居酒屋</option>
              <option value="fancy_dining">お洒落ダイニング</option>
              <option value="bar_cafe">BAR/夜カフェ</option>
            </select>
          </div>

          <div className="field">
            <div className="field-label">合コン費用</div>
            <select
              value={prefs.cost_pref}
              onChange={e=>setPrefs({...prefs, cost_pref: e.target.value as any})}
            >
              <option value="split_even">全員で割り勘がいい</option>
              <option value="men_pay_all">男性が全て払う</option>
              <option value="follow_partner">相手に合わせる</option>
            </select>
          </div>

          <div className="field">
            <div className="field-label">合コン参加日</div>
            <input
              type="date"
              value={setup.desired_date || ''}
              onChange={e=>setSetup({...setup, desired_date: e.target.value})}
            />
          </div>

          <button className="button btn-primary" onClick={handleSave}>条件を保存</button>
        </div>
      </div>
    </div>
  );
}