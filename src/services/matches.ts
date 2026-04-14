import { supabase } from '@/lib/supabase';
import type { Match } from '@/types';

export async function listMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_number', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
