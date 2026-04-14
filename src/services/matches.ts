import { supabase } from '@/lib/supabase';
import type { Match } from '@/types';

export async function fetchAllMatches(): Promise<Match[]> {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .order('match_number', { ascending: true });

  return (data ?? []) as Match[];
}
