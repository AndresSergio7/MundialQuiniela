import { supabase } from '@/lib/supabase';
import type { Prediction } from '@/types';

interface SavePredictionInput {
  pool_id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
}

export async function getPredictions(userId: string, poolId: string): Promise<Prediction[]> {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .eq('pool_id', poolId);

  if (error) throw error;
  return data ?? [];
}

export async function savePrediction(input: SavePredictionInput): Promise<Prediction> {
  const { data, error } = await supabase
    .from('predictions')
    .upsert(input, {
      onConflict: 'pool_id,user_id,match_id',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function submitPredictions(poolId: string, userId: string) {
  const { data: predictions, error: predictionsError } = await supabase
    .from('predictions')
    .select('*')
    .eq('pool_id', poolId)
    .eq('user_id', userId);

  if (predictionsError) throw predictionsError;

  const validationErrors: string[] = [];

  if (!predictions || predictions.length !== 72) {
    validationErrors.push('You must complete all 72 matches.');
  }

  const scoreCounts = new Map<string, number>();
  let drawCount = 0;

  for (const p of predictions ?? []) {
    const key = `${p.home_score}-${p.away_score}`;
    scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);

    if (p.home_score === p.away_score) {
      drawCount += 1;
    }
  }

  if (drawCount < 5) {
    validationErrors.push('You must predict at least 5 draws.');
  }

  const distinctScores = scoreCounts.size;
  if (distinctScores < 7) {
    validationErrors.push('You must use at least 7 different scorelines.');
  }

  const repeatedAtLeastTwice = Array.from(scoreCounts.values()).filter((count) => count >= 2).length;
  if (repeatedAtLeastTwice < 5) {
    validationErrors.push('At least 5 scorelines must appear 2 or more times.');
  }

  const overusedScore = Array.from(scoreCounts.values()).some((count) => count > 28);
  if (overusedScore) {
    validationErrors.push('No scoreline can be used more than 28 times.');
  }

  const payload = {
    pool_id: poolId,
    user_id: userId,
    submitted_at: new Date().toISOString(),
    is_valid: validationErrors.length === 0,
    validation_errors: validationErrors,
    locked_at: validationErrors.length === 0 ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from('submissions')
    .upsert(payload, {
      onConflict: 'pool_id,user_id',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
