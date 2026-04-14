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

// Get standings merged with all pool members so everyone shows up (0 pts)
export async function getStandingsWithAllMembers(poolId: string): Promise<Standing[]> {
  const [standingsData, membersData] = await Promise.all([
    supabase
      .from('standings')
      .select('*, profile:profiles(id, username, full_name, avatar_url)')
      .eq('pool_id', poolId)
      .order('total_points', { ascending: false }),
    supabase
      .from('pool_members')
      .select('user_id, profile:profiles(id, username, full_name, avatar_url)')
      .eq('pool_id', poolId),
  ]);

  const standings = (standingsData.data ?? []) as Standing[];
  const members = (membersData.data ?? []) as Array<{ user_id: string; profile: Standing['profile'] }>;

  const standingUserIds = new Set(standings.map((s) => s.user_id));

  // Append placeholder rows for members with no standings entry
  const placeholders: Standing[] = members
    .filter((m) => !standingUserIds.has(m.user_id))
    .map((m) => ({
      id: `placeholder_${m.user_id}`,
      pool_id: poolId,
      user_id: m.user_id,
      total_points: 0,
      exact_scores: 0,
      correct_results: 0,
      matches_played: 0,
      rank: null,
      updated_at: '',
      profile: m.profile,
    }));

  const all = [...standings, ...placeholders];

  // Assign display ranks (tied users get same rank)
  let rank = 1;
  for (let i = 0; i < all.length; i++) {
    if (i > 0 && all[i].total_points < all[i - 1].total_points) {
      rank = i + 1;
    }
    all[i] = { ...all[i], rank: all[i].total_points === 0 && placeholders.includes(all[i]) ? null : (all[i].rank ?? rank) };
  }

  return all;
}
