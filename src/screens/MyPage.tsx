// src/screens/MyPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyPage.css';
import { getProfile } from '../api';

type Profile = {
  id?: string | number;
  nickname?: string | null;
  age?: number | null;
  occupation?: string | null;
  photo_url?: string | null;
};

function ChevronRight() {
  return (
    <svg className="mp-chevron" viewBox="0 0 24 24" aria-hidden>
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg className="mp-back" viewBox="0 0 24 24" aria-hidden>
      <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function MyPage() {
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await getProfile(); // { profile: {...} }
        setProfile(r?.profile ?? null);
      } catch (e) {
        console.warn('[mypage] getProfile failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ageTxt = profile?.age ? `${profile.age}歳` : '';
  const occTxt = profile?.occupation ?? '';
  const nameTxt = profile?.nickname ?? '';
  const subtitle = [ageTxt, occTxt].filter(Boolean).join('　');

  return (
    <div className="mp-root">
      {/* LIFF の上部バー下に余白 */}
      <div className="mp-safe" />

      {/* ヘッダ */}
      <header className="mp-header">
        <button className="mp-iconbtn" onClick={() => nav(-1)} aria-label="戻る">
          <BackIcon />
        </button>
        <div className="mp-titleWrap">
          <div className="mp-title">マイページ</div>
          <div className="mp-subtitle">https://the4app.net</div>
        </div>
        <div className="mp-rightspace" />
      </header>

      {/* 本文 */}
      <main className="mp-main">
        {/* プロフィールカード */}
        <section className="mp-card mp-profileCard" onClick={() => nav('/profile')}>
          <div className="mp-avatarWrap">
            <img
              className="mp-avatar"
              src={
                profile?.photo_url ||
                'https://placehold.co/120x120?text=%20' // フォールバック
              }
              alt=""
            />
          </div>
          <div className="mp-profileText">
            <div className="mp-name">{nameTxt || (loading ? '読み込み中…' : '—')}</div>
            <div className="mp-mini">{subtitle || 'プロフィールを設定しましょう'}</div>
            <div className="mp-editLink">プロフィールを編集</div>
          </div>
          <ChevronRight />
        </section>

        {/* メニューリスト */}
        <nav className="mp-list">
          <button className="mp-item" onClick={() => nav('/mypage/preferences')}>
            <span className="mp-ico">📝</span>
            <span className="mp-label">希望条件変更</span>
            <ChevronRight />
          </button>

          <button className="mp-item" onClick={() => nav('/mypage/faq')}>
            <span className="mp-ico">❓</span>
            <span className="mp-label">よくある質問</span>
            <ChevronRight />
          </button>

          <button className="mp-item" onClick={() => nav('/mypage/invite')}>
            <span className="mp-ico">👥</span>
            <span className="mp-label">招待して合コンチケットをGET</span>
            <ChevronRight />
          </button>

          <button className="mp-item" onClick={() => nav('/mypage/account')}>
            <span className="mp-ico">⚙️</span>
            <span className="mp-label">アカウント</span>
            <ChevronRight />
          </button>
        </nav>

        <div className="mp-bottomPad" />
      </main>
    </div>
  );
}