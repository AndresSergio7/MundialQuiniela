import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import type { Standing } from '@/types';

export async function fetchStandings(poolId: string): Promise<Standing[]> {
  const { data, error } = await supabase
    .from('standings')
    .select('*, profile:profiles(id, username, full_name, avatar_url)')
    .eq('pool_id', poolId)
    .order('rank', { ascending: true, nullsFirst: false });
  if (error) throw new AppError('FETCH_STANDINGS_FAILED', error.message);
  return (data ?? []) as Standing[];
}

export const getStandings = fetchStandings;

export async function getStandingsWithAllMembers(poolId: string): Promise<Standing[]> {
  const standings = await fetchStandings(poolId);
  const sorted = [...standings].sort((a, b) => b.total_points - a.total_points);

  let rank = 1;
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i].total_points < sorted[i - 1].total_points) {
      rank = i + 1;
    }
    sorted[i] = { ...sorted[i], rank };
  }

  return sorted;
}
