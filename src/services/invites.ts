// ============================================================
// INVITE SERVICE
// ============================================================

import { supabase } from '@/lib/supabase';
import { joinPool } from './pools';
import type { Invite } from '@/types';
import * as Crypto from 'expo-crypto';

const INVITE_DEEP_LINK_BASE = 'mundialquiniela://join';

// ---- generateInviteLink ----
export async function generateInviteLink(
  adminId: string,
  poolId: string
): Promise<{ link: string | null; invite: Invite | null; error: string | null }> {
  // Verify caller is admin
  const { data: pool } = await supabase
    .from('pools')
    .select('admin_id, invite_token')
    .eq('id', poolId)
    .single();

  if (!pool) return { link: null, invite: null, error: 'Pool not found.' };
  if (pool.admin_id !== adminId) {
    return { link: null, invite: null, error: 'Only admin can generate invites.' };
  }

  // Generate unique token
  const bytes = await Crypto.getRandomBytesAsync(16);
  const token = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const { data: invite, error } = await supabase
    .from('invites')
    .insert({
      pool_id: poolId,
      token,
      created_by: adminId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error || !invite) {
    return { link: null, invite: null, error: error?.message ?? 'Failed to create invite.' };
  }

  const link = `${INVITE_DEEP_LINK_BASE}?pool=${poolId}&token=${token}`;
  return { link, invite: invite as Invite, error: null };
}

// ---- joinViaInvite ----
export async function joinViaInvite(
  userId: string,
  poolId: string,
  token: string
): Promise<{ success: boolean; error: string | null }> {
  // Validate invite
  const { data: invite } = await supabase
    .from('invites')
    .select('*')
    .eq('pool_id', poolId)
    .eq('token', token)
    .is('used_by', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!invite) {
    return { success: false, error: 'Invalid or expired invite link.' };
  }

  // Join pool
  const { success, error } = await joinPool(userId, poolId);
  if (!success) return { success: false, error };

  // Mark invite as used
  await supabase
    .from('invites')
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq('id', invite.id);

  return { success: true, error: null };
}

// ---- getActiveInvites ----
export async function getActiveInvites(poolId: string): Promise<Invite[]> {
  const { data } = await supabase
    .from('invites')
    .select('*')
    .eq('pool_id', poolId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  return (data ?? []) as Invite[];
}

// ---- resolveInviteFromDeepLink ----
export function parseInviteLink(url: string): { poolId: string; token: string } | null {
  try {
    const parsed = new URL(url.replace('mundialquiniela://', 'https://mundialquiniela.app/'));
    const poolId = parsed.searchParams.get('pool');
    const token = parsed.searchParams.get('token');
    if (!poolId || !token) return null;
    return { poolId, token };
  } catch {
    return null;
  }
}
