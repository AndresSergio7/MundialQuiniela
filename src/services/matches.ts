import { supabase } from '@/lib/supabase';
import type { Match } from '@/types';

export async function fetchAllMatches(): Promise<Match[]> {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .order('match_number', { ascending: true });

  return (data ?? []) as Match[];
}

// Alias for compatibility with any code that uses listMatches
export const listMatches = fetchAllMatches;
