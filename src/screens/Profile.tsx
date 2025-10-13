// src/screens/Profile.tsx
import { useEffect, useState } from 'react';
import { whenAuthReady } from '../liff';
import { getProfile, saveProfile } from '../api';

type ProfilePayload = {
  profile?: {
    displayName?: string;
    picture?: string;
    ageVerified?: boolean; // 将来拡張用（ダミーでもOK）
  };
};

export default function Profile() {
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [picture, setPicture] = useState('');

  useEffect(() => {
    (async () => {
      try {
        await whenAuthReady();
        const data = (await getProfile().catch(() => null)) as ProfilePayload | null;
        if (data?.profile?.displayName) setDisplayName(data.profile.displayName);
        if (data?.profile?.picture) setPicture(data.profile.picture);
        setLoaded(true);
      } catch (e: any) {
        console.error('[Profile] init failed', e);
        setError(e?.message ?? 'initialize_failed');
      }
    })();
  }, []);

  async function onSave() {
    try {
      setSaving(true);
      await saveProfile({
        profile: {
          displayName: displayName || 'ユーザー',
          picture: picture || undefined,
        },
      });
      alert('保存しました');
    } catch (e: any) {
      console.error('[Profile] save failed', e);
      alert('保存に失敗しました: ' + (e?.message ?? 'unknown_error'));
    } finally {
      setSaving(false);
    }
  }

  if (error) return <div style={{ padding: 16, color: 'red' }}>エラー: {error}</div>;
  if (!loaded) return <div style={{ padding: 16 }}>読み込み中...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>プロフィール</h2>

      <div style={field}>
        <label style={label}>表示名</label>
        <input
          style={input}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="表示名"
        />
      </div>

      <div style={field}>
        <label style={label}>アイコンURL（任意）</label>
        <input
          style={input}
          value={picture}
          onChange={(e) => setPicture(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <button onClick={onSave} disabled={saving} style={primaryBtn}>
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  );
}

const field: React.CSSProperties = { marginBottom: 14, display: 'grid', gap: 6 };
const label: React.CSSProperties = { fontWeight: 600 };
const input: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
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
};