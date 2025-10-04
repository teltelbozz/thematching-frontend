import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { whenAuthReady } from '../liff';
import { getProfile } from '../api';

type Profile = {
  nickname?: string;
  age?: number;
  avatar_url?: string; // 将来の拡張用
};

export default function MyPage() {
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await whenAuthReady();
        const res = await getProfile().catch(() => null);
        if (res?.profile) setProfile(res.profile);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="safe">
      <h2 className="menu-title">マイページ</h2>

      {/* ヘッダー（簡易） */}
      <div style={{
        display:'grid', gridTemplateColumns:'56px 1fr', gap:12,
        background:'#111214', padding:12, borderRadius:12, border:'1px solid #20222a', marginBottom:16
      }}>
        <div style={{
          width:56, height:56, borderRadius:'50%', background:'#15161a',
          display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700
        }}>
          {profile.nickname ? profile.nickname[0] : '🙂'}
        </div>
        <div>
          <div style={{fontSize:18, fontWeight:700}}>
            {profile.age ? `${profile.age}歳` : ''} {profile.nickname || '（未設定）'}
          </div>
          <button
            onClick={()=>nav('/profile')}
            style={{marginTop:6, fontSize:14, background:'transparent', color:'#e6c36a', border:'none'}}
          >
            プロフィールを編集 &gt;
          </button>
        </div>
      </div>

      {/* メニュータイル */}
      <div style={{display:'grid', gap:12}}>
        <Tile label="希望条件変更" onClick={()=>nav('/profile?tab=prefs')} />
        <Tile label="よくある質問" onClick={()=>nav('/faq')} />
        <Tile label="招待して合コンチケットをGET" onClick={()=>alert('将来実装')} />
        <Tile label="アカウント" onClick={()=>alert('将来実装')} />
      </div>

      {loading && <div style={{marginTop:12, color:'#9aa0a6'}}>読み込み中...</div>}
    </div>
  );
}

function Tile({label, onClick}:{label:string; onClick:()=>void}) {
  return (
    <button className="tile" style={{height:56, justifyContent:'space-between', padding:'0 14px'}} onClick={onClick}>
      <div className="label" style={{fontSize:15, fontWeight:600}}>{label}</div>
      <div style={{opacity:.6}}>›</div>
    </button>
  );
}