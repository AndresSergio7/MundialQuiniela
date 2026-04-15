// ============================================================
// INVITE SERVICE — V1
// Uses pool.invite_token (1 reusable token per pool).
// Capacity enforced by pool.max_members + member count.
// ============================================================

import { supabase } from '@/lib/supabase';

export const INVITE_WEB_BASE = 'https://mundial-quiniela-ruddy.vercel.app';

// Build the invite link for a pool using its invite_token
export function buildInviteLink(poolId: string, token: string): string {
  return `${INVITE_WEB_BASE}/join?pool=${poolId}&token=${token}`;
}

// ---- generateInviteLink ----
// Returns the reusable invite URL for a pool. Does NOT modify the DB.
export async function generateInviteLink(
  adminId: string,
  poolId: string
): Promise<{ link: string | null; error: string | null }> {
  const { data: pool } = await supabase
    .from('pools')
    .select('admin_id, invite_token, name')
    .eq('id', poolId)
    .maybeSingle();

  if (!pool) return { link: null, error: 'Pool not found.' };
  if (pool.admin_id !== adminId) {
    return { link: null, error: 'Only the pool admin can share invites.' };
  }

  const link = buildInviteLink(poolId, pool.invite_token);
  return { link, error: null };
}

// ---- joinViaInvite ----
// Calls the SECURITY DEFINER RPC which bypasses RLS on the pools table
// so non-members can validate the invite token and join atomically.
export async function joinViaInvite(
  _userId: string,
  poolId: string,
  token: string
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('join_pool_via_invite', {
    p_pool_id: poolId,
    p_token: token,
  });

  if (error) return { success: false, error: error.message };

  const result = data as { success: boolean; error: string | null };
  return result;
}

// ---- parseInviteLink ----
// Parses both the new web URL and the legacy deep-link format.
export function parseInviteLink(url: string): { poolId: string; token: string } | null {
  try {
    // Normalise legacy deep link so URL constructor can parse it
    const normalised = url.startsWith('mundialquiniela://')
      ? url.replace('mundialquiniela://join', `${INVITE_WEB_BASE}/join`)
      : url;

    const parsed = new URL(normalised);
    const poolId = parsed.searchParams.get('pool');
    const token = parsed.searchParams.get('token');
    if (!poolId || !token) return null;
    return { poolId, token };
  } catch {
    return null;
  }
}
