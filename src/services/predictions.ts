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
  userId: string
): Promise<Prediction[]> {
  const { data } = await supabase
    .from('predictions')
    .select('*, match:matches(*)')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .order('match_id');

  return (data ?? []) as Prediction[];
}

// ---- savePrediction ----
export async function savePrediction(
  poolId: string,
  userId: string,
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<{ success: boolean; error: string | null }> {
  const { data: pool } = await supabase
    .from('pools')
    .select('prediction_deadline')
    .eq('id', poolId)
    .maybeSingle();

  if (!pool) return { success: false, error: 'Pool not found.' };
  if (new Date(pool.prediction_deadline) <= new Date()) {
    return { success: false, error: 'Prediction deadline has passed.' };
  }

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
    { onConflict: 'pool_id,user_id,match_id' }
  );

  return { success: !error, error: error?.message ?? null };
}

// ---- savePredictionsBulk ----
export async function savePredictionsBulk(
  poolId: string,
  userId: string,
  predictions: PredictionMap
): Promise<{ success: boolean; error: string | null }> {
  const { data: pool } = await supabase
    .from('pools')
    .select('prediction_deadline')
    .eq('id', poolId)
    .maybeSingle();

  if (!pool) return { success: false, error: 'Pool not found.' };
  if (new Date(pool.prediction_deadline) <= new Date()) {
    return { success: false, error: 'Prediction deadline has passed.' };
  }

  const rows = Object.entries(predictions).map(([matchId, pred]) => ({
    pool_id: poolId,
    user_id: userId,
    match_id: matchId,
    home_score: pred.home,
    away_score: pred.away,
    is_locked: false,
  }));

  const { error } = await supabase
    .from('predictions')
    .upsert(rows, { onConflict: 'pool_id,user_id,match_id' });

  return { success: !error, error: error?.message ?? null };
}

// ---- submitQuiniela ----
export async function submitQuiniela(
  poolId: string,
  userId: string
): Promise<{ success: boolean; errors: string[] }> {
  const matches = await fetchAllMatches();
  const matchIds = matches.map((m) => m.id);

  const predictions = await fetchUserPredictions(poolId, userId);
  const predMap: PredictionMap = {};
  for (const p of predictions) {
    predMap[p.match_id] = { home: p.home_score, away: p.away_score };
  }

  const validation: ValidationResult = validateQuiniela(predMap, matchIds);

  await supabase.from('submissions').upsert(
    {
      pool_id: poolId,
      user_id: userId,
      submitted_at: new Date().toISOString(),
      is_valid: validation.valid,
      validation_errors: validation.errors,
    },
    { onConflict: 'pool_id,user_id' }
  );

  // Ensure user appears in standings immediately (0 pts placeholder)
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
    { onConflict: 'pool_id,user_id' }
  );

  return { success: validation.valid, errors: validation.errors };
}

// ---- lockPredictions ----
export async function lockPredictions(poolId: string): Promise<void> {
  await supabase
    .from('predictions')
    .update({ is_locked: true })
    .eq('pool_id', poolId);

  await supabase
    .from('submissions')
    .update({ locked_at: new Date().toISOString() })
    .eq('pool_id', poolId);
}

// ---- getSubmissionStatus ----
export async function getSubmissionStatus(
  poolId: string,
  userId: string
): Promise<Submission | null> {
  const { data } = await supabase
    .from('submissions')
    .select('*')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .maybeSingle();

  return (data as Submission | null) ?? null;
}

// ---- toPredictionMap ----
export function toPredictionMap(predictions: Prediction[]): PredictionMap {
  return predictions.reduce<PredictionMap>((acc, p) => {
    acc[p.match_id] = { home: p.home_score, away: p.away_score };
    return acc;
  }, {});
}

// Re-export for backwards compatibility
export { fetchAllMatches };
