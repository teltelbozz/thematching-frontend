// src/screens/Profile.tsx
import { useEffect, useState } from 'react';
import { whenAuthReady } from '../liff';
import { getProfile, saveProfile } from '../api';

type Gender = 'male' | 'female' | 'other';

export default function ProfileSetup() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [occupation, setOccupation] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // サーバーログイン完了を待つ（重要）
        await whenAuthReady();

        const r = await getProfile(); // { profile: {...} }
        if (!cancelled) {
          const p = r?.profile || {};
          setNickname(p.nickname ?? '');
          setAge(p.age ?? '');
          setGender((p.gender as Gender) ?? '');
          setOccupation(p.occupation ?? '');
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveProfile({
        nickname: nickname || null,
        age: age === '' ? null : age,
        gender: gender || null,
        occupation: occupation || null,
      });
      // 保存後の遷移は App.tsx 側の BootRouter に任せる運用でもOKだが、
      // ここで明示的にホームへ戻すのもアリ
      location.replace('/');
    } catch (e: any) {
      setError(e?.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 16 }}>プロフィールを読み込み中…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 520 }}>
      <h1>プロフィール登録</h1>
      <p>まずは基本情報を登録しましょう。</p>

      {error && (
        <div style={{ background: '#fee', padding: 8, borderRadius: 6, margin: '12px 0' }}>
          エラー: {error}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div style={{ margin: '12px 0' }}>
          <label>
            ニックネーム（必須）<br />
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              placeholder="テスト太郎"
              style={{ width: '100%', padding: 8 }}
            />
          </label>
        </div>

        <div style={{ margin: '12px 0' }}>
          <label>
            年齢<br />
            <input
              type="number"
              min={18}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="28"
              style={{ width: '100%', padding: 8 }}
            />
          </label>
        </div>

        <div style={{ margin: '12px 0' }}>
          <label>
            性別<br />
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              style={{ width: '100%', padding: 8 }}
            >
              <option value="">選択なし</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
            </select>
          </label>
        </div>

        <div style={{ margin: '12px 0' }}>
          <label>
            職業<br />
            <input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="engineer"
              style={{ width: '100%', padding: 8 }}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving || !nickname}
          style={{ padding: '10px 16px' }}
        >
          {saving ? '保存中…' : '保存してはじめる'}
        </button>
      </form>
    </div>
  );
}