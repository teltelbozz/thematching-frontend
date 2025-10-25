import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProfile } from '../api';

type Profile = {
  id: number | string;
  nickname?: string | null;
  age?: number | null;
  occupation?: string | null;
  photo_url?: string | null;
};

export default function MyPage() {
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await getProfile(); // { profile: {...} }
        const p = r?.profile as Profile | undefined;
        if (!p) throw new Error('no_profile');
        // ガード：ニックネーム未設定ならセットアップへ
        if (!p.nickname) return nav('/profile', { replace: true });
        setProfile(p);
      } catch (e) {
        console.warn('[mypage] getProfile failed', e);
        nav('/profile', { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  if (loading) {
    return <div className="p-6 text-gray-500">読み込み中…</div>;
  }
  if (!profile) return null;

  return (
    <div className="max-w-screen-sm mx-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h1 className="text-xl font-semibold">マイページ</h1>
      </div>

      {/* Card: 顔写真 + 基本 */}
      <div className="px-4 py-4 flex items-center gap-4">
        <Avatar url={profile.photo_url} name={profile.nickname || ''} />
        <div className="flex-1">
          <div className="text-lg font-medium">
            {profile.age ? `${profile.age}歳 ` : ''}{profile.nickname}
          </div>
          <div className="text-sm text-gray-500">
            {profile.occupation || '—'}
          </div>
          <Link to="/profile" className="text-blue-600 text-sm underline mt-1 inline-block">
            プロフィールを編集 &gt;
          </Link>
        </div>
      </div>

      {/* Menu list */}
      <nav className="mt-2 divide-y bg-white">
        <MenuItem to="/mypage/preferences" label="希望条件変更" />
        <MenuItem to="/mypage/faq"         label="よくある質問" />
        <MenuItem to="/mypage/invite"      label="招待して合コンチケットをGET" />
        <MenuItem to="/mypage/account"     label="アカウント" />
      </nav>
    </div>
  );
}

function Avatar({ url, name }: { url?: string | null; name: string }) {
  if (url) {
    return <img src={url} alt="avatar" className="w-16 h-16 rounded-full object-cover" />;
  }
  const initial = (name || '？').slice(0, 1);
  return (
    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl">
      {initial}
    </div>
  );
}

function MenuItem({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex items-center justify-between px-4 py-4 hover:bg-gray-50">
      <span className="text-base">{label}</span>
      <span className="text-gray-400">›</span>
    </Link>
  );
}