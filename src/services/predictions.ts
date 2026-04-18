// ============================================================
// PREDICTIONS SERVICE
// ============================================================

import { supabase } from '@/lib/supabase';
import { validateQuiniela, validateSinglePrediction } from '@/lib/validation';
import { fetchAllMatches } from '@/services/matches';
import type {
  Prediction,
  PredictionMap,
  Submission,
  ValidationResult,
} from '@/types';

// ---- fetchUserPredictions ----
export async function fetchUserPredictions(
  poolId: string,
  userId: string,
): Promise<Prediction[]> {
  const { data } = await supabase
    .from('predictions')
    .select('*, match:matches(*)')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .order('match_id');

  return (data ?? []) as Prediction[];
}

// Alias used by some screens
export const getPredictions = (userId: string, poolId: string) =>
  fetchUserPredictions(poolId, userId);

// ---- guard helpers ---------------------------------------

async function assertEditable(
  poolId: string,
  userId: string,
): Promise<string | null> {
  const { data: pool } = await supabase
    .from('pools')
    .select('prediction_deadline')
    .eq('id', poolId)
    .maybeSingle();
  if (!pool) return 'Pool not found.';
  if (new Date(pool.prediction_deadline) <= new Date()) {
    return 'Prediction deadline has passed.';
  }

  // Client-side mirror of the is_final DB flag.  Once a user has
  // submitted a valid quiniela, no more edits are allowed.
  const { data: sub } = await supabase
    .from('submissions')
    .select('is_final')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .maybeSingle();
  if (sub?.is_final) return 'Tu quiniela ya fue enviada y está bloqueada.';
  return null;
}

// ---- savePrediction --------------------------------------
export async function savePrediction(
  poolId: string,
  userId: string,
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<{ success: boolean; error: string | null }> {
  const blocked = await assertEditable(poolId, userId);
  if (blocked) return { success: false, error: blocked };

  const validErr = validateSinglePrediction(homeScore, awayScore);
  if (validErr) return { success: false, error: validErr };

  const { error } = await supabase.from('predictions').upsert(
    {
      pool_id: poolId,
      user_id: userId,
      match_id: matchId,
      home_score: homeScore,
      away_score: awayScore,
      is_locked: false,
    },
    { onConflict: 'pool_id,user_id,match_id' },
  );

  return { success: !error, error: error?.message ?? null };
}

// ---- savePredictionsBulk ---------------------------------
export async function savePredictionsBulk(
  poolId: string,
  userId: string,
  predictions: PredictionMap,
): Promise<{ success: boolean; error: string | null }> {
  const blocked = await assertEditable(poolId, userId);
  if (blocked) return { success: false, error: blocked };

  const rows = Object.entries(predictions).map(([matchId, pred]) => ({
    pool_id: poolId,
    user_id: userId,
    match_id: matchId,
    home_score: pred.home,
    away_score: pred.away,
    is_locked: false,
  }));

  if (!rows.length) return { success: true, error: null };

  const { error } = await supabase
    .from('predictions')
    .upsert(rows, { onConflict: 'pool_id,user_id,match_id' });

  return { success: !error, error: error?.message ?? null };
}

// ---- submitQuiniela --------------------------------------
// Atomic path: delegates to the submit_quiniela RPC so the DB
// flips is_final, locks every prediction row, and inserts a
// placeholder standings row in one transaction.
export async function submitQuiniela(
  poolId: string,
  userId: string,
): Promise<{ success: boolean; errors: string[] }> {
  const matches = await fetchAllMatches();
  const matchIds = matches.map((m) => m.id);

  const predictions = await fetchUserPredictions(poolId, userId);
  const predMap: PredictionMap = {};
  for (const p of predictions) {
    predMap[p.match_id] = { home: p.home_score, away: p.away_score };
  }

  let validation: ValidationResult;
  try {
    const { TEST_MODE, TEST_POOL_CONFIG } = await import('@/lib/testMode');
    validation =
      TEST_MODE && TEST_POOL_CONFIG.skipValidationRules
        ? { valid: true, errors: [] }
        : validateQuiniela(predMap, matchIds);
  } catch {
    validation = validateQuiniela(predMap, matchIds);
  }

  // Preferred path: SECURITY DEFINER RPC locks predictions atomically.
  const { data: rpcData, error: rpcError } = await supabase.rpc('submit_quiniela', {
    p_pool_id: poolId,
    p_is_valid: validation.valid,
    p_errors: validation.errors,
  });

  if (!rpcError) {
    const res = rpcData as { success: boolean; error: string | null };
    return {
      success: res.success && validation.valid,
      errors: res.success ? validation.errors : [...validation.errors, res.error ?? ''],
    };
  }

  // Fallback (RPC not deployed) — keep the old two-write path.
  if (!rpcError.message.includes('Could not find the function')) {
    return { success: false, errors: [rpcError.message, ...validation.errors] };
  }

  await supabase.from('submissions').upsert(
    {
      pool_id: poolId,
      user_id: userId,
      submitted_at: new Date().toISOString(),
      is_valid: validation.valid,
      is_final: validation.valid,
      validation_errors: validation.errors,
      locked_at: validation.valid ? new Date().toISOString() : null,
    },
    { onConflict: 'pool_id,user_id' },
  );

  if (validation.valid) {
    await supabase
      .from('predictions')
      .update({ is_locked: true })
      .eq('pool_id', poolId)
      .eq('user_id', userId);
  }

  await supabase.from('standings').upsert(
    {
      pool_id: poolId,
      user_id: userId,
      total_points: 0,
      exact_scores: 0,
      correct_results: 0,
      matches_played: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'pool_id,user_id' },
  );

  return { success: validation.valid, errors: validation.errors };
}

// Alias for backwards compatibility
export const submitPredictions = submitQuiniela;

// ---- lockPredictions -------------------------------------
export async function lockPredictions(poolId: string): Promise<void> {
  await supabase
    .from('predictions')
    .update({ is_locked: true })
    .eq('pool_id', poolId);

  await supabase
    .from('submissions')
    .update({ locked_at: new Date().toISOString(), is_final: true })
    .eq('pool_id', poolId);
}

// ---- getSubmissionStatus ---------------------------------
export async function getSubmissionStatus(
  poolId: string,
  userId: string,
): Promise<Submission | null> {
  const { data } = await supabase
    .from('submissions')
    .select('*')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .maybeSingle();

  return (data as Submission | null) ?? null;
}

// ---- getSubmissionsForPools ------------------------------
// Batch replacement for the N+1 loop on the home screen.
// Returns a map keyed by pool_id so callers can do O(1) lookup.
export async function getSubmissionsForPools(
  userId: string,
  poolIds: string[],
): Promise<Record<string, Submission | null>> {
  if (!poolIds.length) return {};

  const map: Record<string, Submission | null> = {};
  for (const id of poolIds) map[id] = null;

  // Try the SECURITY DEFINER RPC first (single round-trip + bypasses RLS).
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'get_submissions_for_pools',
    { p_pool_ids: poolIds },
  );

  if (!rpcError && Array.isArray(rpcData)) {
    for (const row of rpcData) {
      map[row.pool_id] = row as Submission;
    }
    return map;
  }

  // Fallback: direct query.
  const { data } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', userId)
    .in('pool_id', poolIds);

  for (const row of data ?? []) {
    map[(row as Submission).pool_id] = row as Submission;
  }
  return map;
}

// ---- toPredictionMap -------------------------------------
export function toPredictionMap(predictions: Prediction[]): PredictionMap {
  return predictions.reduce<PredictionMap>((acc, p) => {
    acc[p.match_id] = { home: p.home_score, away: p.away_score };
    return acc;
  }, {});
}

// Re-export for backwards compatibility
export { fetchAllMatches };
