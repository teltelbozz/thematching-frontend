import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { whenAuthReady } from '../liff';
import { getProfile, saveProfile, getPrefs, savePrefs } from '../api';

type Profile = {
  nickname?: string;
  age?: number;
  job?: string;
  hometown?: string;
  residence_pref?: string;
  residence_city?: string;
  personality?: string;
  income_band?: string;
  mood?: string;
  experience_count?: string;
  university?: string;
  education?: string;
};

type Prefs = {
  purpose?: string;
  age_min?: number;
  age_max?: number;
  style?: 'slim'|'normal'|'glamour'|'no_matter';
  female_mood?: string;
  female_personality?: string;
};

export default function ProfileScreen(){
  const { search } = useLocation();
  const initTab = useMemo(()=> new URLSearchParams(search).get('tab') === 'prefs' ? 'prefs' : 'profile', [search]);

  const [tab, setTab] = useState<'profile'|'prefs'>(initTab);
  const [profile, setProfile] = useState<Profile>({});
  const [prefs, setPrefs] = useState<Prefs>({});
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async ()=>{
      try{
        await whenAuthReady();
        const p = await getProfile().catch(()=>null);
        if (p?.profile) setProfile(p.profile);
        const pr = await getPrefs().catch(()=>null);
        if (pr?.prefs) setPrefs(pr.prefs);
      }finally{
        setLoading(false);
      }
    })();
  },[]);

  async function handleSave(){
    await saveProfile(profile);
    await savePrefs(prefs);
    alert('保存しました');
  }

  return (
    <div className="safe">
      <h1 className="page-title">プロフィール</h1>

      {/* タブ */}
      <div className="tabs">
        <button className={`tab ${tab==='profile'?'active':''}`} onClick={()=>setTab('profile')}>プロフィール</button>
        <button className={`tab ${tab==='prefs'?'active':''}`} onClick={()=>setTab('prefs')}>希望条件</button>
      </div>

      {loading && <div className="text-muted">読み込み中...</div>}

      {/* 本体 */}
      <div className="card">
        {tab === 'profile' && (
          <div className="form">
            <Field label="ニックネーム">
              <input value={profile.nickname||''} onChange={e=>setProfile({...profile, nickname:e.target.value})}/>
            </Field>
            <Field label="年齢">
              <input type="number" min={18} max={80} value={profile.age||''}
                     onChange={e=>setProfile({...profile, age: Number(e.target.value)||undefined})}/>
            </Field>
            <Field label="学歴">
              <select value={profile.education||''} onChange={e=>setProfile({...profile, education:e.target.value})}>
                <option value="">選択…</option>
                <option>大学卒</option><option>大学院卒</option><option>短大/専門</option><option>高校卒</option>
              </select>
            </Field>
            <Field label="大学名">
              <input value={profile.university||''} onChange={e=>setProfile({...profile, university:e.target.value})}/>
            </Field>
            <Field label="出身地">
              <input value={profile.hometown||''} onChange={e=>setProfile({...profile, hometown:e.target.value})}/>
            </Field>
            <Field label="お住まい（都道府県）">
              <input value={profile.residence_pref||''} onChange={e=>setProfile({...profile, residence_pref:e.target.value})}/>
            </Field>
            <Field label="お住まい（市区）">
              <input value={profile.residence_city||''} onChange={e=>setProfile({...profile, residence_city:e.target.value})}/>
            </Field>
            <Field label="職業">
              <input value={profile.job||''} onChange={e=>setProfile({...profile, job:e.target.value})}/>
            </Field>
            <Field label="性格">
              <input value={profile.personality||''} onChange={e=>setProfile({...profile, personality:e.target.value})}/>
            </Field>
            <Field label="年収">
              <select value={profile.income_band||''} onChange={e=>setProfile({...profile, income_band:e.target.value})}>
                <option value="">選択…</option>
                <option>〜400万</option><option>400-600万</option><option>600-800万</option>
                <option>800-1000万</option><option>1000-1500万</option><option>1500万〜</option>
              </select>
            </Field>
            <Field label="雰囲気">
              <input value={profile.mood||''} onChange={e=>setProfile({...profile, mood:e.target.value})}/>
            </Field>
            <Field label="合コン経験回数">
              <select value={profile.experience_count||''} onChange={e=>setProfile({...profile, experience_count:e.target.value})}>
                <option value="">選択…</option>
                <option>はじめて</option><option>1-3回</option><option>4-9回</option><option>10回以上</option>
              </select>
            </Field>
          </div>
        )}

        {tab === 'prefs' && (
          <div className="form">
            <Field label="目的">
              <select value={prefs.purpose||''} onChange={e=>setPrefs({...prefs, purpose:e.target.value})}>
                <option value="">選択…</option>
                <option>ワイワイノリ重視</option>
                <option>恋活/婚活につながる</option>
                <option>その場を楽しむこと</option>
                <option>特になし</option>
              </select>
            </Field>
            <Field label="女性の年齢（最小）">
              <input type="number" min={18} max={80} value={prefs.age_min||''}
                     onChange={e=>setPrefs({...prefs, age_min:Number(e.target.value)||undefined})}/>
            </Field>
            <Field label="女性の年齢（最大）">
              <input type="number" min={18} max={80} value={prefs.age_max||''}
                     onChange={e=>setPrefs({...prefs, age_max:Number(e.target.value)||undefined})}/>
            </Field>
            <Field label="女性のスタイル">
              <select value={prefs.style||''} onChange={e=>setPrefs({...prefs, style:e.target.value as any})}>
                <option value="">選択…</option>
                <option value="slim">スリム</option>
                <option value="normal">普通</option>
                <option value="glamour">グラマー</option>
                <option value="no_matter">気にしない</option>
              </select>
            </Field>
            <Field label="女性の雰囲気">
              <input value={prefs.female_mood||''} onChange={e=>setPrefs({...prefs, female_mood:e.target.value})}/>
            </Field>
            <Field label="女性の性格">
              <input value={prefs.female_personality||''} onChange={e=>setPrefs({...prefs, female_personality:e.target.value})}/>
            </Field>
          </div>
        )}
      </div>

      <div style={{marginTop: 14}}>
        <button className="button btn-primary" onClick={handleSave}>保存する</button>
      </div>
    </div>
  );
}

function Field({label, children}:{label:string; children:any}) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      {children}
    </div>
  );
}