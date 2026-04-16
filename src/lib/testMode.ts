// ============================================================
// TEST HARNESS
// ============================================================
//
// Enabled by setting EXPO_PUBLIC_TEST_MODE=true in your .env file.
// All exported functions throw in production — safe to import anywhere.
//
// Usage:
//   import { TEST_MODE, seedFakeUsers, setMatchResult, calculatePoints } from '@/lib/testMode';
//
// Typical QA session:
//   1. const { pool } = await createTestPool(adminId, 'QA Pool', 3);
//   2. await seedFakeUsers(pool.id, 2);
//   3. // each user saves + submits predictions via the normal UI/service
//   4. const { match } = await setMatchResult(matchId, 2, 1);
//   5. await calculatePoints(pool.id);
//   6. // inspect standings — only submitted users should appear
//   7. await cleanTestPool(pool.id); // reset
// ============================================================

import { supabase } from '@/lib/supabase';
import { recalculateStandings } from '@/lib/api';
import type { Pool, Match } from '@/types';

// ─────────────────────────────────────────────
// TEST_MODE flag
// ─────────────────────────────────────────────
export const TEST_MODE: boolean =
  process.env.EXPO_PUBLIC_TEST_MODE === 'true';

// ─────────────────────────────────────────────
// Test pool defaults
// ─────────────────────────────────────────────
export const TEST_POOL_CONFIG = {
  /** Allow a pool to work with just 1 member. */
  minParticipants: 1,
  /** Default max_members for test pools. */
  defaultMaxMembers: 3,
  /**
   * Skip quiniela scoreline/count rules (72 matches, ≥7 distinct scorelines…).
   * Predictions are still type-validated (whole numbers 0-20).
   */
  skipValidationRules: true,
} as const;

// ─────────────────────────────────────────────
// Guard
// ─────────────────────────────────────────────
function assertTestMode(fnName: string): void {
  if (!TEST_MODE) {
    throw new Error(
      `${fnName}() is only available in TEST_MODE. ` +
        'Set EXPO_PUBLIC_TEST_MODE=true in your .env and restart the dev server.'
    );
  }
}

// ─────────────────────────────────────────────
// createTestPool
// ─────────────────────────────────────────────
// Creates a pool without consuming an entitlement.
// Useful when you need a fresh pool for each QA run.
export async function createTestPool(
  adminId: string,
  name: string,
  maxMembers: number = TEST_POOL_CONFIG.defaultMaxMembers,
): Promise<{ pool: Pool | null; error: string | null }> {
  assertTestMode('createTestPool');

  if (maxMembers < TEST_POOL_CONFIG.minParticipants || maxMembers > 100) {
    return { pool: null, error: 'maxMembers must be between 1 and 100.' };
  }

  const { data: pool, error } = await supabase
    .from('pools')
    .insert({ name, admin_id: adminId, max_members: maxMembers })
    .select()
    .single();

  if (error || !pool) {
    return { pool: null, error: error?.message ?? 'Failed to create test pool.' };
  }

  await supabase.from('pool_members').insert({
    pool_id: pool.id,
    user_id: adminId,
    role: 'admin',
  });

  return { pool: pool as Pool, error: null };
}

// ─────────────────────────────────────────────
// seedFakeUsers
// ─────────────────────────────────────────────
// Inserts `count` synthetic users into pool_members (and profiles).
// Fake users cannot sign in — they exist only to populate standings/QA checks.
// Each fake user gets a deterministic UUID so the function is idempotent.
export async function seedFakeUsers(
  poolId: string,
  count: number,
): Promise<{ inserted: number; error: string | null }> {
  assertTestMode('seedFakeUsers');

  if (count < 1 || count > 50) {
    return { inserted: 0, error: 'count must be between 1 and 50.' };
  }

  const { data: pool } = await supabase
    .from('pools')
    .select('max_members')
    .eq('id', poolId)
    .maybeSingle();

  if (!pool) {
    return { inserted: 0, error: 'Pool not found.' };
  }

  const { count: currentCount } = await supabase
    .from('pool_members')
    .select('*', { count: 'exact', head: true })
    .eq('pool_id', poolId);

  const available = pool.max_members - (currentCount ?? 0);
  const toInsert = Math.min(count, available);

  if (toInsert <= 0) {
    return { inserted: 0, error: 'Pool is full — no slots available for fake users.' };
  }

  // Build deterministic UUIDs from pool suffix + index.
  // Format: 00000000-0000-{i:04x}-0000-{last-12-chars-of-pool-id}
  // This is not a valid RFC-4122 UUID version but works as a DB UUID value.
  const poolSuffix = poolId.replace(/-/g, '').slice(20); // last 12 hex chars
  const profiles: Array<{ id: string; username: string; full_name: string }> = [];
  const members: Array<{ pool_id: string; user_id: string; role: 'member' }> = [];

  for (let i = 1; i <= toInsert; i++) {
    const fakeId = `00000000-0000-${i.toString(16).padStart(4, '0')}-0000-${poolSuffix}`;
    profiles.push({
      id: fakeId,
      username: `test_user_${i}`,
      full_name: `Test User ${i}`,
    });
    members.push({ pool_id: poolId, user_id: fakeId, role: 'member' });
  }

  // Profiles first (foreign key dependency)
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert(profiles, { onConflict: 'id', ignoreDuplicates: true });

  if (profileErr) {
    return { inserted: 0, error: `Profile upsert failed: ${profileErr.message}` };
  }

  const { error: memberErr } = await supabase
    .from('pool_members')
    .upsert(members, { onConflict: 'pool_id,user_id', ignoreDuplicates: true });

  if (memberErr) {
    return { inserted: 0, error: `Member upsert failed: ${memberErr.message}` };
  }

  return { inserted: toInsert, error: null };
}

// ─────────────────────────────────────────────
// setMatchResult
// ─────────────────────────────────────────────
// Directly sets a match's score and marks it finished.
// After calling this, run calculatePoints(poolId) to update standings.
export async function setMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<{ match: Match | null; error: string | null }> {
  assertTestMode('setMatchResult');

  if (
    !Number.isInteger(homeScore) || homeScore < 0 || homeScore > 20 ||
    !Number.isInteger(awayScore) || awayScore < 0 || awayScore > 20
  ) {
    return { match: null, error: 'Scores must be whole numbers between 0 and 20.' };
  }

  const { data, error } = await supabase
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: 'finished',
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select()
    .single();

  if (error) return { match: null, error: error.message };
  return { match: data as Match, error: null };
}

// ─────────────────────────────────────────────
// calculatePoints
// ─────────────────────────────────────────────
// Recalculates standings for a pool.
// Only users with a valid submission are scored (draft users are excluded).
// Internally calls recalculateStandings which handles the full scoring pipeline.
export async function calculatePoints(
  poolId: string,
): Promise<{ error: string | null }> {
  assertTestMode('calculatePoints');

  try {
    await recalculateStandings(poolId);
    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error during calculatePoints.';
    return { error: message };
  }
}

// ─────────────────────────────────────────────
// cleanTestPool
// ─────────────────────────────────────────────
// Removes all fake users and their predictions/standings from a pool.
// Idempotent — safe to call between test runs.
export async function cleanTestPool(poolId: string): Promise<{ error: string | null }> {
  assertTestMode('cleanTestPool');

  // Identify fake member IDs (deterministic prefix)
  const { data: fakeMembers } = await supabase
    .from('pool_members')
    .select('user_id')
    .eq('pool_id', poolId)
    .like('user_id', '00000000-0000-%');

  if (!fakeMembers?.length) return { error: null };

  const fakeIds = fakeMembers.map((m) => m.user_id);

  // Remove in dependency order
  await supabase.from('standings').delete().eq('pool_id', poolId).in('user_id', fakeIds);
  await supabase.from('submissions').delete().eq('pool_id', poolId).in('user_id', fakeIds);
  await supabase.from('predictions').delete().eq('pool_id', poolId).in('user_id', fakeIds);
  await supabase.from('pool_members').delete().eq('pool_id', poolId).in('user_id', fakeIds);
  await supabase.from('profiles').delete().in('id', fakeIds);

  return { error: null };
}

// ─────────────────────────────────────────────
// SQL: race-safe pool join (run in Supabase SQL editor)
// ─────────────────────────────────────────────
// The client-side joinPool() has a TOCTOU race: two users can both read
// count < max_members and both insert.  The function below fixes this by
// holding a row-level lock on the pool row for the duration of the check.
//
// Run this once in your Supabase SQL editor, then the RPC-first path in
// joinPool() will use it automatically.
//
export const JOIN_POOL_SAFE_SQL = `
-- Race-safe pool join via row-level lock
CREATE OR REPLACE FUNCTION join_pool_safe(p_pool_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pool   pools%ROWTYPE;
  v_count  INTEGER;
  v_user   UUID := auth.uid();
BEGIN
  -- Lock the pool row to serialise concurrent joins
  SELECT * INTO v_pool FROM pools WHERE id = p_pool_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Pool not found.');
  END IF;

  IF NOT v_pool.is_active THEN
    RETURN json_build_object('success', false, 'error', 'Pool is not active.');
  END IF;

  SELECT COUNT(*) INTO v_count FROM pool_members WHERE pool_id = p_pool_id;

  IF v_count >= v_pool.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Pool is full.');
  END IF;

  -- Check already a member
  IF EXISTS (SELECT 1 FROM pool_members WHERE pool_id = p_pool_id AND user_id = v_user) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this pool.');
  END IF;

  INSERT INTO pool_members (pool_id, user_id, role)
  VALUES (p_pool_id, v_user, 'member');

  RETURN json_build_object('success', true, 'error', null);
END;
$$;

GRANT EXECUTE ON FUNCTION join_pool_safe(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
`;
