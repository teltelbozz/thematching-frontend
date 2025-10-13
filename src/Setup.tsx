// src/screens/Setup.tsx
import { useEffect, useState } from 'react';
import { whenAuthReady } from './liff';
import { getSetup, saveSetup } from './api';

type SetupState = {
  // 参加スタイル： "solo" | "with_friends"
  style?: 'solo' | 'with_friends';
  // 合コンの種類
  kind?: 'talk' | 'play' | 'either';
  // お店
  place?: 'cheap' | 'dining' | 'bar';
  // 費用
  cost?: 'men_pay' | 'split' | 'match';
  // 希望日（簡易）
  date?: string; // YYYY-MM-DD
};

export default function Setup() {
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<SetupState>({
    style: 'solo',
    kind: 'either',
    place: 'dining',
    cost: 'match',
    date: '',
  });

  useEffect(() => {
    (async () => {
      try {
        await whenAuthReady();
        const data = (await getSetup().catch(() => null)) as SetupState | null;
        if (data) setForm((prev) => ({ ...prev, ...data }));
        setLoaded(true);
      } catch (e: any) {
        console.error('[Setup] init failed', e);
        setError(e?.message ?? 'initialize_failed');
      }
    })();
  }, []);

  function update<K extends keyof SetupState>(key: K, val: SetupState[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  async function onSave() {
    try {
      setSaving(true);
      await saveSetup(form);
      alert('保存しました');
    } catch (e: any) {
      console.error('[Setup] save failed', e);
      alert('保存に失敗しました: ' + (e?.message ?? 'unknown_error'));
    } finally {
      setSaving(false);
    }
  }

  if (error) return <div style={{ padding: 16, color: 'red' }}>エラー: {error}</div>;
  if (!loaded) return <div style={{ padding: 16 }}>読み込み中...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>合コンの設定</h2>

      {/* 参加スタイル */}
      <Section title="参加スタイル">
        <Row>
          <Radio
            name="style"
            checked={form.style === 'solo'}
            label="一人で参加"
            onChange={() => update('style', 'solo')}
          />
          <Radio
            name="style"
            checked={form.style === 'with_friends'}
            label="友達と参加"
            onChange={() => update('style', 'with_friends')}
          />
        </Row>
      </Section>

      {/* 合コンの種類 */}
      <Section title="どんな合コンがいい？">
        <Row>
          <Radio
            name="kind"
            checked={form.kind === 'talk'}
            label="話す（居酒屋/ダイニング）"
            onChange={() => update('kind', 'talk')}
          />
          <Radio
            name="kind"
            checked={form.kind === 'play'}
            label="遊ぶ（シーシャ/ダーツ）"
            onChange={() => update('kind', 'play')}
          />
          <Radio
            name="kind"
            checked={form.kind === 'either'}
            label="どちらでも良い"
            onChange={() => update('kind', 'either')}
          />
        </Row>
      </Section>

      {/* お店について */}
      <Section title="お店について">
        <Row>
          <Radio
            name="place"
            checked={form.place === 'cheap'}
            label="安ウマ居酒屋"
            onChange={() => update('place', 'cheap')}
          />
          <Radio
            name="place"
            checked={form.place === 'dining'}
            label="お洒落ダイニング"
            onChange={() => update('place', 'dining')}
          />
          <Radio
            name="place"
            checked={form.place === 'bar'}
            label="BAR/夜カフェ"
            onChange={() => update('place', 'bar')}
          />
        </Row>
      </Section>

      {/* 合コン費用 */}
      <Section title="合コン費用">
        <Row>
          <Radio
            name="cost"
            checked={form.cost === 'men_pay'}
            label="男性が全て払う"
            onChange={() => update('cost', 'men_pay')}
          />
          <Radio
            name="cost"
            checked={form.cost === 'split'}
            label="全員で割り勘がいい"
            onChange={() => update('cost', 'split')}
          />
          <Radio
            name="cost"
            checked={form.cost === 'match'}
            label="相手に合わせる"
            onChange={() => update('cost', 'match')}
          />
        </Row>
      </Section>

      {/* 希望日（ざっくり） */}
      <Section title="合コン参加日（希望日）">
        <input
          type="date"
          value={form.date || ''}
          onChange={(e) => update('date', e.target.value)}
          style={input}
        />
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
          ※「人気日」表示などは今後の拡張で付けます
        </p>
      </Section>

      <button onClick={onSave} disabled={saving} style={primaryBtn}>
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 18 }}>
      <h3 style={{ margin: '8px 0 10px', fontSize: 16, fontWeight: 700 }}>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gap: 10 }}>{children}</div>;
}

function Radio({
  name,
  checked,
  label,
  onChange,
}: {
  name: string;
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label style={radioLabel}>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

const input: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  fontSize: 16,
  width: '100%',
};

const radioLabel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
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