// src/screens/Profile.tsx
import { useEffect, useState } from 'react';
import { whenAuthReady } from '../liff';
import { getProfile, saveProfile } from '../api';
import { useNavigate } from 'react-router-dom';

type ProfileData = {
  profile?: {
    displayName?: string;
    picture?: string;
    ageVerified?: boolean;
  };
};

export default function Profile() {
  const nav = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState<string>('');
  const [picture, setPicture] = useState<string>('');
  const [ageVerified, setAgeVerified] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        await whenAuthReady();
        const data = (await getProfile()) as ProfileData;
        setDisplayName(data?.profile?.displayName ?? '');
        setPicture(data?.profile?.picture ?? '');
        setAgeVerified(Boolean(data?.profile?.ageVerified));
      } catch (e: any) {
        setErr(e?.message ?? 'プロフィール取得に失敗しました');
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function onSave() {
    try {
      setSaving(true);
      setErr(null);
      await saveProfile({
        profile: {
          displayName: displayName || 'ユーザー',
          picture: picture || undefined,
          ageVerified,
        },
      });
      // 保存後は合コン設定へ遷移
      nav('/setup', { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? 'プロフィール保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div style={page}>
        <h1 style={title}>プロフィール</h1>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={page}>
      <h1 style={title}>プロフィール</h1>
      {err && <p style={errorBox}>{err}</p>}

      <div style={formRow}>
        <label style={label}>表示名</label>
        <input
          style={input}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="ニックネーム"
        />
      </div>

      <div style={formRow}>
        <label style={label}>写真URL（任意）</label>
        <input
          style={input}
          value={picture}
          onChange={(e) => setPicture(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div style={{ ...formRow, alignItems: 'center' }}>
        <label style={label}>年齢確認（ダミー）</label>
        <input
          type="checkbox"
          checked={ageVerified}
          onChange={(e) => setAgeVerified(e.target.checked)}
        />
        <span style={{ marginLeft: 8, color: '#666' }}>後で本実装予定</span>
      </div>

      <div style={{ marginTop: 24 }}>
        <button style={primaryBtn} onClick={onSave} disabled={saving}>
          {saving ? '保存中...' : '保存して次へ'}
        </button>
      </div>
    </div>
  );
}

const page: React.CSSProperties = {
  padding: 16,
  maxWidth: 560,
  margin: '0 auto',
};
const title: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  margin: '0 0 16px',
};
const formRow: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginBottom: 16,
};
const label: React.CSSProperties = {
  fontSize: 14,
  color: '#475569',
  fontWeight: 700,
};
const input: React.CSSProperties = {
  padding: '12px 14px',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  fontSize: 16,
};
const primaryBtn: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: 12,
  background: '#0ea5e9',
  color: '#fff',
  border: 'none',
  fontWeight: 700,
  cursor: 'pointer',
  width: '100%',
};
const errorBox: React.CSSProperties = {
  background: '#fee2e2',
  color: '#991b1b',
  padding: '8px 12px',
  borderRadius: 8,
  marginBottom: 12,
  fontSize: 14,
};