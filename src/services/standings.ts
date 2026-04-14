// ============================================================
// STANDINGS SERVICE
// ============================================================

import { supabase } from '@/lib/supabase';
import type { Standing } from '@/types';

export async function getStandings(poolId: string): Promise<Standing[]> {
  const { data } = await supabase
    .from('standings')
    .select('*, profile:profiles(id, username, full_name, avatar_url)')
    .eq('pool_id', poolId)
    .order('rank', { ascending: true, nullsFirst: false });

  return (data ?? []) as Standing[];
}

export async function getUserStanding(
  poolId: string,
  userId: string
): Promise<Standing | null> {
  const { data } = await supabase
    .from('standings')
    .select('*')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .single();

  return data as Standing | null;
}
