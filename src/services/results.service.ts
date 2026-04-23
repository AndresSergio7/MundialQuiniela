import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';

export async function recalculateStandings(poolId: string): Promise<void> {
  const { error } = await supabase.rpc('recalculate_standings', { p_pool_id: poolId });
  if (error) throw new AppError('RECALCULATE_STANDINGS_FAILED', error.message);
}

export async function syncResults(poolId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('sync-results');
    if (error) throw error;
  } catch {
    // Fallback: at least refresh standings from current DB state.
    await recalculateStandings(poolId);
  }
}
