// src/routes/profile.ts
import { Router } from 'express';
import type { Pool } from 'pg';
import { readBearer, verifyAccess } from '../auth/tokenService';

const router = Router();

function normalizeClaims(v: any): any {
  // verifyAccess の戻りが { payload } / あるいは payload そのもの どちらでも対応
  if (v && typeof v === 'object' && 'payload' in v) return (v as any).payload;
  return v;
}

function normalizeUidNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/**
 * アクセストークン内 claims の uid が:
 *  - 数値 … そのまま返す
 *  - 文字列（LINEの sub 想定 = "U..."）… users.line_user_id から id を解決
 *    - 見つからなければ INSERT して id を払い出す（フォールバック）
 */
async function resolveUserIdFromClaims(claims: any, db: Pool): Promise<number | null> {
  const raw = claims?.uid;

  // 1) すでに数値ならそのまま
  const asNum = normalizeUidNumber(raw);
  if (asNum != null) return asNum;

  // 2) 文字列（LINE sub 想定）なら DB で解決
  if (typeof raw === 'string' && raw.trim()) {
    const sub = raw.trim();
    // 既存ユーザー検索
    const r1 = await db.query<{ id: number }>(
      'SELECT id FROM users WHERE line_user_id = $1 LIMIT 1',
      [sub],
    );
    if (r1.rows[0]) return r1.rows[0].id;

    // なければ作成（最小カラムで作成）
    const r2 = await db.query<{ id: number }>(
      'INSERT INTO users (line_user_id) VALUES ($1) RETURNING id',
      [sub],
    );
    return r2.rows[0]?.id ?? null;
  }

  return null;
}

// GET /api/profile  …自分のプロフィール取得
router.get('/', async (req, res) => {
  try {
    const token = readBearer(req);
    if (!token) return res.status(401).json({ error: 'unauthenticated' });

    const verified = await verifyAccess(token);
    const claims = normalizeClaims(verified);

    const db = req.app.locals.db as Pool | undefined;
    if (!db) {
      console.error('[profile:get] db_not_initialized');
      return res.status(500).json({ error: 'server_error' });
    }

    const uid = await resolveUserIdFromClaims(claims, db);
    if (uid == null) return res.status(401).json({ error: 'unauthenticated' });

    const r = await db.query(
      `SELECT u.id, u.line_user_id, u.payment_method_set,
              p.nickname, p.age, p.gender, p.occupation,
              p.education, p.university, p.hometown, p.residence,
              p.personality, p.income, p.atmosphere,
              p.photo_url, p.photo_masked_url, p.verified_age
         FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE u.id = $1`,
      [uid],
    );

    // まだ未登録でも 200 で id だけ返す
    if (!r.rows[0]) return res.json({ profile: { id: uid } });
    return res.json({ profile: r.rows[0] });
  } catch (e: any) {
    console.error('[profile:get]', e?.message || e);
    return res.status(500).json({ error: 'server_error' });
  }
});

// PUT /api/profile  …自分のプロフィール作成/更新（upsert）
router.put('/', async (req, res) => {
  try {
    const token = readBearer(req);
    if (!token) return res.status(401).json({ error: 'unauthenticated' });

    const verified = await verifyAccess(token);
    const claims = normalizeClaims(verified);

    const db = req.app.locals.db as Pool | undefined;
    if (!db) {
      console.error('[profile:put] db_not_initialized');
      return res.status(500).json({ error: 'server_error' });
    }

    const uid = await resolveUserIdFromClaims(claims, db);
    if (uid == null) return res.status(401).json({ error: 'unauthenticated' });

    const {
      nickname,
      age,
      gender,
      occupation,
      education,
      university,
      hometown,
      residence,
      personality,
      income,
      atmosphere,
      photo_url,
      photo_masked_url,
    } = req.body || {};

    // 簡易バリデーション（既存+拡張項目）
    if (nickname != null && typeof nickname !== 'string') return res.status(400).json({ error: 'invalid_nickname' });
    if (age != null) {
      const ageNum = typeof age === 'number' ? age : Number(age);
      if (!(Number.isInteger(ageNum) && ageNum >= 18 && ageNum <= 120)) {
        return res.status(400).json({ error: 'invalid_age' });
      }
    }
    if (gender != null && typeof gender !== 'string') return res.status(400).json({ error: 'invalid_gender' });
    if (occupation != null && typeof occupation !== 'string') return res.status(400).json({ error: 'invalid_occupation' });

    if (education != null && typeof education !== 'string') return res.status(400).json({ error: 'invalid_education' });
    if (university != null && typeof university !== 'string') return res.status(400).json({ error: 'invalid_university' });
    if (hometown != null && typeof hometown !== 'string') return res.status(400).json({ error: 'invalid_hometown' });
    if (residence != null && typeof residence !== 'string') return res.status(400).json({ error: 'invalid_residence' });
    if (personality != null && typeof personality !== 'string') return res.status(400).json({ error: 'invalid_personality' });

    if (income != null) {
      const incomeNum = typeof income === 'number' ? income : Number(income);
      if (!Number.isFinite(incomeNum) || incomeNum < 0) {
        return res.status(400).json({ error: 'invalid_income' });
      }
    }

    if (atmosphere != null && typeof atmosphere !== 'string') return res.status(400).json({ error: 'invalid_atmosphere' });

    if (photo_url != null && typeof photo_url !== 'string') return res.status(400).json({ error: 'invalid_photo_url' });
    if (photo_masked_url != null && typeof photo_masked_url !== 'string') return res.status(400).json({ error: 'invalid_photo_masked_url' });

    await db.query(
      `INSERT INTO user_profiles (
          user_id, nickname, age, gender, occupation,
          education, university, hometown, residence,
          personality, income, atmosphere,
          photo_url, photo_masked_url
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (user_id) DO UPDATE SET
         nickname         = COALESCE(EXCLUDED.nickname,         user_profiles.nickname),
         age              = COALESCE(EXCLUDED.age,              user_profiles.age),
         gender           = COALESCE(EXCLUDED.gender,           user_profiles.gender),
         occupation       = COALESCE(EXCLUDED.occupation,       user_profiles.occupation),
         education        = COALESCE(EXCLUDED.education,        user_profiles.education),
         university       = COALESCE(EXCLUDED.university,       user_profiles.university),
         hometown         = COALESCE(EXCLUDED.hometown,         user_profiles.hometown),
         residence        = COALESCE(EXCLUDED.residence,        user_profiles.residence),
         personality      = COALESCE(EXCLUDED.personality,      user_profiles.personality),
         income           = COALESCE(EXCLUDED.income,           user_profiles.income),
         atmosphere       = COALESCE(EXCLUDED.atmosphere,       user_profiles.atmosphere),
         photo_url        = COALESCE(EXCLUDED.photo_url,        user_profiles.photo_url),
         photo_masked_url = COALESCE(EXCLUDED.photo_masked_url, user_profiles.photo_masked_url),
         updated_at = NOW()`,
      [
        uid,
        nickname ?? null,
        (age ?? null),
        gender ?? null,
        occupation ?? null,
        education ?? null,
        university ?? null,
        hometown ?? null,
        residence ?? null,
        personality ?? null,
        (income ?? null),
        atmosphere ?? null,
        photo_url ?? null,
        photo_masked_url ?? null,
      ],
    );

    const r = await db.query(
      `SELECT u.id, u.line_user_id, u.payment_method_set,
              p.nickname, p.age, p.gender, p.occupation,
              p.education, p.university, p.hometown, p.residence,
              p.personality, p.income, p.atmosphere,
              p.photo_url, p.photo_masked_url, p.verified_age
         FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE u.id = $1`,
      [uid],
    );
    return res.json({ profile: r.rows[0] });
  } catch (e: any) {
    console.error('[profile:put]', e?.message || e);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;