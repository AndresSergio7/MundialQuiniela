import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import type { Match } from '@/types';

export async function fetchMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true });
  if (error) throw new AppError('FETCH_MATCHES_FAILED', error.message);
  return (data ?? []) as Match[];
}

export const fetchAllMatches = fetchMatches;
export const listMatches = fetchMatches;
