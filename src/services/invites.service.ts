import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import type { Invite } from '@/types';

function randomToken(size = 24): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < size; i += 1) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return token;
}

export const INVITE_WEB_BASE = 'https://mundial-quiniela-ruddy.vercel.app';

export async function fetchInvites(poolId: string): Promise<Invite[]> {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('pool_id', poolId)
    .order('created_at', { ascending: false });
  if (error) throw new AppError('FETCH_INVITES_FAILED', error.message);
  return (data ?? []) as Invite[];
}

export async function createInvite(poolId: string): Promise<Invite> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new AppError('AUTH_USER_FETCH_FAILED', userError.message);
  if (!user) throw new AppError('AUTH_REQUIRED', 'Not authenticated.');

  const { data, error } = await supabase
    .from('invites')
    .insert({
      pool_id: poolId,
      token: randomToken(),
      created_by: user.id,
    })
    .select()
    .single();
  if (error) throw new AppError('CREATE_INVITE_FAILED', error.message);
  return data as Invite;
}

export async function acceptInvite(token: string, userId: string): Promise<void> {
  const { data: invite, error: inviteError } = await supabase
    .from('invites')
    .select('id, pool_id, used_by, expires_at')
    .eq('token', token)
    .maybeSingle();
  if (inviteError) throw new AppError('FETCH_INVITE_FAILED', inviteError.message);
  if (!invite) throw new AppError('INVITE_NOT_FOUND', 'Invite not found.');
  if (invite.used_by) throw new AppError('INVITE_ALREADY_USED', 'Invite already used.');
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw new AppError('INVITE_EXPIRED', 'Invite expired.');
  }

  const { data: existingMember, error: memberFetchError } = await supabase
    .from('pool_members')
    .select('id')
    .eq('pool_id', invite.pool_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (memberFetchError) {
    throw new AppError('CHECK_POOL_MEMBER_FAILED', memberFetchError.message);
  }
  if (!existingMember) {
    const { error: joinError } = await supabase
      .from('pool_members')
      .insert({ pool_id: invite.pool_id, user_id: userId, role: 'member' });
    if (joinError) throw new AppError('JOIN_POOL_FROM_INVITE_FAILED', joinError.message);
  }

  const { error: inviteUpdateError } = await supabase
    .from('invites')
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq('id', invite.id);
  if (inviteUpdateError) throw new AppError('MARK_INVITE_USED_FAILED', inviteUpdateError.message);
}

export function buildInviteLink(poolId: string, token: string): string {
  return `${INVITE_WEB_BASE}/join?pool=${poolId}&token=${token}`;
}

/**
 * Vincula la compra (entitlement global sin pool) a esta quiniela y sube `max_members`,
 * o solo sincroniza cupo si ya había entitlement ligado. Usado al invitar y tras comprar plan.
 */
export async function applyUnusedEntitlementToPool(
  adminId: string,
  poolId: string,
): Promise<{ error: string | null }> {
  const { data: pool, error } = await supabase
    .from('pools')
    .select('admin_id, max_members')
    .eq('id', poolId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!pool) return { error: 'Pool not found.' };
  if (pool.admin_id !== adminId) return { error: 'Only the pool admin can upgrade this pool.' };

  const { data: linkedEntitlement, error: linkedEntitlementError } = await supabase
    .from('entitlements')
    .select('id, base_slots')
    .eq('user_id', adminId)
    .eq('pool_id', poolId)
    .eq('has_app_access', true)
    .maybeSingle();

  if (linkedEntitlementError) return { error: linkedEntitlementError.message };

  if (linkedEntitlement && pool.max_members < linkedEntitlement.base_slots) {
    const { error: syncPoolCapacityError } = await supabase
      .from('pools')
      .update({
        max_members: linkedEntitlement.base_slots,
        updated_at: new Date().toISOString(),
      })
      .eq('id', poolId);
    if (syncPoolCapacityError) return { error: syncPoolCapacityError.message };
  }

  if (linkedEntitlement) {
    return { error: null };
  }

  if (pool.max_members > 1) {
    return { error: null };
  }

  let { data: unusedEntitlement, error: unusedEntitlementError } = await supabase
    .from('entitlements')
    .select('id, base_slots')
    .eq('user_id', adminId)
    .is('pool_id', null)
    .eq('has_app_access', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (unusedEntitlementError) return { error: unusedEntitlementError.message };

  if (!unusedEntitlement) {
    const { data: verifiedPayments, error: verifiedPaymentsError } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', adminId)
      .eq('status', 'verified')
      .eq('payment_type', 'app_access')
      .order('created_at', { ascending: true });

    if (verifiedPaymentsError) return { error: verifiedPaymentsError.message };

    if ((verifiedPayments ?? []).length > 0) {
      await Promise.all(
        (verifiedPayments ?? []).map((payment) =>
          supabase.rpc('grant_entitlement_from_payment', { p_payment_id: payment.id }),
        ),
      );

      const retry = await supabase
        .from('entitlements')
        .select('id, base_slots')
        .eq('user_id', adminId)
        .is('pool_id', null)
        .eq('has_app_access', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      unusedEntitlement = retry.data;
      unusedEntitlementError = retry.error;
    }
  }

  if (unusedEntitlementError) return { error: unusedEntitlementError.message };
  if (!unusedEntitlement) return { error: 'PURCHASE_REQUIRED' };

  const { error: entitlementUpdateError } = await supabase
    .from('entitlements')
    .update({ pool_id: poolId, updated_at: new Date().toISOString() })
    .eq('id', unusedEntitlement.id);
  if (entitlementUpdateError) return { error: entitlementUpdateError.message };

  const { error: poolUpdateError } = await supabase
    .from('pools')
    .update({ max_members: unusedEntitlement.base_slots, updated_at: new Date().toISOString() })
    .eq('id', poolId);
  if (poolUpdateError) return { error: poolUpdateError.message };

  return { error: null };
}

/** Si el usuario es admin de una sola quiniela "solo" (max 1), es el candidato a upgrade tras comprar. */
export async function getSingleSoloAdminPoolId(adminId: string): Promise<string | undefined> {
  const { data, error } = await supabase
    .from('pools')
    .select('id')
    .eq('admin_id', adminId)
    .lte('max_members', 1);
  if (error || !data || data.length !== 1) return undefined;
  return data[0].id;
}

export async function generateInviteLink(
  adminId: string,
  poolId: string,
): Promise<{ link: string | null; error: string | null }> {
  const { error: applyError } = await applyUnusedEntitlementToPool(adminId, poolId);
  if (applyError) return { link: null, error: applyError };

  const { data: pool, error } = await supabase
    .from('pools')
    .select('invite_token')
    .eq('id', poolId)
    .maybeSingle();
  if (error) return { link: null, error: error.message };
  if (!pool) return { link: null, error: 'Pool not found.' };

  return { link: buildInviteLink(poolId, pool.invite_token), error: null };
}

export async function joinViaInvite(
  userId: string,
  poolId: string,
  token: string,
): Promise<{ success: boolean; error: string | null }> {
  // Use the SECURITY DEFINER RPC so non-members can look up the pool
  // (the RLS policy pools_select_member would otherwise return null for non-members).
  const { data: rpcData, error: rpcError } = await supabase.rpc('join_pool_via_invite', {
    p_pool_id: poolId,
    p_token: token,
  });

  if (!rpcError) {
    const result = rpcData as { success: boolean; error: string | null } | null;
    return {
      success: result?.success ?? false,
      error: result?.error ?? null,
    };
  }

  // Fallback for environments where migration 018 hasn't been applied yet.
  // Note: this path will fail with "Pool not found" for non-members due to RLS.
  if (!rpcError.message.toLowerCase().includes('could not find the function')) {
    return { success: false, error: rpcError.message };
  }

  const { data: pool, error: poolError } = await supabase
    .from('pools')
    .select('invite_token, is_active, max_members')
    .eq('id', poolId)
    .maybeSingle();
  if (poolError) return { success: false, error: poolError.message };
  if (!pool) return { success: false, error: 'Pool not found.' };
  if (pool.invite_token !== token) return { success: false, error: 'Invalid invite token.' };
  if (!pool.is_active) return { success: false, error: 'Pool is not active or does not exist.' };

  const { count, error: countError } = await supabase
    .from('pool_members')
    .select('*', { count: 'exact', head: true })
    .eq('pool_id', poolId);
  if (countError) return { success: false, error: countError.message };
  if ((count ?? 0) >= pool.max_members) return { success: false, error: 'Pool is full.' };

  const { data: existing, error: existingError } = await supabase
    .from('pool_members')
    .select('id')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .maybeSingle();
  if (existingError) return { success: false, error: existingError.message };
  if (existing) return { success: false, error: 'Already a member of this pool.' };

  const { error } = await supabase
    .from('pool_members')
    .insert({ pool_id: poolId, user_id: userId, role: 'member' });
  return { success: !error, error: error?.message ?? null };
}

export function parseInviteLink(url: string): { poolId: string; token: string } | null {
  try {
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
