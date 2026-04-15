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
// Primary path: SECURITY DEFINER RPC that bypasses RLS on the pools table
// so non-members can validate the invite token and join atomically.
// Fallback: direct queries (works when pools table allows authenticated reads).
export async function joinViaInvite(
  _userId: string,
  poolId: string,
  token: string
): Promise<{ success: boolean; error: string | null }> {
  // Try the RPC first (created via migration; SECURITY DEFINER bypasses RLS)
  const { data, error: rpcError } = await supabase.rpc('join_pool_via_invite', {
    p_pool_id: poolId,
    p_token: token,
  });

  // If RPC is in the schema cache, trust its result (success or domain error)
  if (!rpcError) {
    return data as { success: boolean; error: string | null };
  }

  // RPC not yet in PostgREST schema cache (can lag a few minutes after migration).
  // Fall back to direct queries — requires pools table to be readable by
  // authenticated users, which is the case when RLS allows member-based SELECT.
  if (!rpcError.message.includes('Could not find the function')) {
    // A real unexpected error from Supabase infra — surface it.
    return { success: false, error: rpcError.message };
  }

  const { data: pool } = await supabase
    .from('pools')
    .select('id, invite_token, is_active, max_members')
    .eq('id', poolId)
    .maybeSingle();

  if (!pool) {
    return { success: false, error: 'Pool not found.' };
  }
  if (pool.invite_token !== token) {
    return { success: false, error: 'Invalid invite token.' };
  }
  if (!pool.is_active) {
    return { success: false, error: 'Pool is not active or does not exist.' };
  }

  const { count } = await supabase
    .from('pool_members')
    .select('*', { count: 'exact', head: true })
    .eq('pool_id', poolId);

  if ((count ?? 0) >= pool.max_members) {
    return { success: false, error: 'Pool is full.' };
  }

  const { data: existing } = await supabase
    .from('pool_members')
    .select('id')
    .eq('pool_id', poolId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'Already a member of this pool.' };
  }

  const { data: session } = await supabase.auth.getUser();
  const uid = session.user?.id;
  if (!uid) return { success: false, error: 'Not authenticated.' };

  const { error: insertError } = await supabase
    .from('pool_members')
    .insert({ pool_id: poolId, user_id: uid, role: 'member' });

  return { success: !insertError, error: insertError?.message ?? null };
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
