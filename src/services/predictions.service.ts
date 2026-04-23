import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import { fetchMatches } from '@/services/matches.service';
import { validateQuiniela } from '@/lib/validation';
import type { Prediction, PredictionMap, Submission } from '@/types';

export async function fetchPredictions(poolId: string, userId: string): Promise<Prediction[]> {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .order('match_id');
  if (error) throw new AppError('FETCH_PREDICTIONS_FAILED', error.message);
  return (data ?? []) as Prediction[];
}

export async function savePredictions(
  poolId: string,
  userId: string,
  scores: PredictionMap,
): Promise<void> {
  const rows = Object.entries(scores).map(([matchId, score]) => ({
    pool_id: poolId,
    user_id: userId,
    match_id: matchId,
    home_score: score.home,
    away_score: score.away,
    is_locked: false,
  }));

  if (!rows.length) return;

  const { error } = await supabase
    .from('predictions')
    .upsert(rows, { onConflict: 'pool_id,user_id,match_id' });
  if (error) throw new AppError('SAVE_PREDICTIONS_FAILED', error.message);
}

export async function fetchSubmission(poolId: string, userId: string): Promise<Submission | null> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new AppError('FETCH_SUBMISSION_FAILED', error.message);
  return (data as Submission | null) ?? null;
}

export async function submitQuiniela(poolId: string, userId: string): Promise<void> {
  const [matches, predictions] = await Promise.all([
    fetchMatches(),
    fetchPredictions(poolId, userId),
  ]);

  const predMap: PredictionMap = {};
  for (const prediction of predictions) {
    predMap[prediction.match_id] = {
      home: prediction.home_score,
      away: prediction.away_score,
    };
  }

  const validation = validateQuiniela(predMap, matches.map((m) => m.id));

  const { data, error } = await supabase.rpc('submit_quiniela', {
    p_pool_id: poolId,
    p_is_valid: validation.valid,
    p_errors: validation.errors,
  });
  if (error) throw new AppError('SUBMIT_QUINIELA_FAILED', error.message);

  const result = data as { success?: boolean; error?: string | null } | null;
  if (!result?.success) {
    const message =
      validation.errors[0] ?? result?.error ?? 'No se pudo enviar la quiniela.';
    throw new AppError('SUBMIT_QUINIELA_REJECTED', message);
  }
}

export const fetchUserPredictions = fetchPredictions;
export const getPredictions = (userId: string, poolId: string) => fetchPredictions(poolId, userId);
export const getSubmissionStatus = fetchSubmission;

export async function savePredictionsBulk(
  poolId: string,
  userId: string,
  predictions: PredictionMap,
): Promise<{ success: boolean; error: string | null }> {
  try {
    await savePredictions(poolId, userId, predictions);
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof AppError ? error.message : 'Error al guardar.',
    };
  }
}

export async function submitQuinielaResult(
  poolId: string,
  userId: string,
): Promise<{ success: boolean; errors: string[] }> {
  try {
    await submitQuiniela(poolId, userId);
    return { success: true, errors: [] };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof AppError ? error.message : 'Error al enviar la quiniela.'],
    };
  }
}

export async function getSubmissionsForPools(
  userId: string,
  poolIds: string[],
): Promise<Record<string, Submission | null>> {
  if (!poolIds.length) return {};

  const result: Record<string, Submission | null> = {};
  for (const id of poolIds) result[id] = null;

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_submissions_for_pools', {
    p_pool_ids: poolIds,
  });

  if (!rpcError && Array.isArray(rpcData)) {
    for (const row of rpcData) result[row.pool_id as string] = row as Submission;
    return result;
  }

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', userId)
    .in('pool_id', poolIds);
  if (error) throw new AppError('GET_SUBMISSIONS_FOR_POOLS_FAILED', error.message);

  for (const row of data ?? []) result[(row as Submission).pool_id] = row as Submission;
  return result;
}
