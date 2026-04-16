// ============================================================
// STANDINGS SERVICE
// ============================================================

import { supabase } from '@/lib/supabase';
import type { Standing, PoolMember } from '@/types';

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
    .maybeSingle();

  return (data as Standing | null) ?? null;
}

// Ensure every pool member has a standings row (0 pts placeholder).
// Safe to call multiple times — uses upsert.
export async function ensureAllMembersInStandings(poolId: string): Promise<void> {
  const { data: members } = await supabase
    .from('pool_members')
    .select('user_id')
    .eq('pool_id', poolId);

  if (!members?.length) return;

  const rows = members.map((m: PoolMember) => ({
    pool_id: poolId,
    user_id: m.user_id,
    total_points: 0,
    exact_scores: 0,
    correct_results: 0,
    matches_played: 0,
    updated_at: new Date().toISOString(),
  }));

  await supabase
    .from('standings')
    .upsert(rows, { onConflict: 'pool_id,user_id', ignoreDuplicates: true });
}

// Get standings — only members who have submitted appear here
export async function getStandingsWithAllMembers(poolId: string): Promise<Standing[]> {
  const { data } = await supabase
    .from('standings')
    .select('*, profile:profiles(id, username, full_name, avatar_url)')
    .eq('pool_id', poolId)
    .order('total_points', { ascending: false });

  const standings = (data ?? []) as Standing[];

  // Assign display ranks (tied users share the same rank)
  let rank = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i > 0 && standings[i].total_points < standings[i - 1].total_points) {
      rank = i + 1;
    }
    standings[i] = { ...standings[i], rank };
  }

  return standings;
}
