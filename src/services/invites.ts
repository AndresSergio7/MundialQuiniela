// ============================================================
// INVITE SERVICE — V1
// Uses pool.invite_token (1 reusable token per pool).
// Capacity enforced by pool.max_members + member count.
// ============================================================

import { supabase } from '@/lib/supabase';
import { joinPool } from './pools';

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
// Validates token against pool.invite_token, then joins the pool.
export async function joinViaInvite(
  userId: string,
  poolId: string,
  token: string
): Promise<{ success: boolean; error: string | null }> {
  const { data: pool } = await supabase
    .from('pools')
    .select('id, invite_token, is_active, max_members, name')
    .eq('id', poolId)
    .maybeSingle();

  if (!pool) return { success: false, error: 'Pool not found.' };
  if (pool.invite_token !== token) return { success: false, error: 'Invalid invite token.' };
  if (!pool.is_active) return { success: false, error: 'This pool is no longer active.' };

  // joinPool handles capacity and duplicate-member checks
  return joinPool(userId, poolId);
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
