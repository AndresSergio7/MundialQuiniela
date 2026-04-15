import { supabase } from '@/lib/supabase';
import type { Pool, PoolMember } from '@/types';

// ---- createPool ----
export async function createPool(
  adminId: string,
  name: string
): Promise<{ pool: Pool | null; error: string | null }> {
  // Find the oldest unused purchase (pool_id IS NULL, has_app_access = true).
  // PostgreSQL allows multiple NULL rows in a UNIQUE(user_id, pool_id) constraint
  // because each NULL is considered distinct from the others.
  const { data: ent } = await supabase
    .from('entitlements')
    .select('id, has_app_access, base_slots')
    .eq('user_id', adminId)
    .is('pool_id', null)
    .eq('has_app_access', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!ent?.has_app_access) {
    return { pool: null, error: 'PURCHASE_REQUIRED' };
  }

  const { data: pool, error } = await supabase
    .from('pools')
    .insert({
      name,
      admin_id: adminId,
      max_members: ent.base_slots,
    })
    .select()
    .single();

  if (error || !pool) {
    return { pool: null, error: error?.message ?? 'Failed to create pool.' };
  }

  // Add admin as member
  await supabase.from('pool_members').insert({
    pool_id: pool.id,
    user_id: adminId,
    role: 'admin',
  });

  // Consume the entitlement by binding it to the new pool
  await supabase
    .from('entitlements')
    .update({ pool_id: pool.id, updated_at: new Date().toISOString() })
    .eq('id', ent.id);

  return { pool: pool as Pool, error: null };
}

// ---- joinPool ----
export async function joinPool(
  userId: string,
  poolId: string
): Promise<{ success: boolean; error: string | null }> {
  const { data: pool } = await supabase
    .from('pools')
    .select('id, is_active, max_members')
    .eq('id', poolId)
    .maybeSingle();

  if (!pool?.is_active) {
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
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'Already a member of this pool.' };
  }

  const { error } = await supabase.from('pool_members').insert({
    pool_id: poolId,
    user_id: userId,
    role: 'member',
  });

  return { success: !error, error: error?.message ?? null };
}

// ---- removeMember ----
export async function removeMember(
  adminId: string,
  poolId: string,
  memberId: string
): Promise<{ success: boolean; error: string | null }> {
  const { data: pool } = await supabase
    .from('pools')
    .select('admin_id')
    .eq('id', poolId)
    .maybeSingle();

  if (pool?.admin_id !== adminId) {
    return { success: false, error: 'Only the admin can remove members.' };
  }
  if (memberId === adminId) {
    return { success: false, error: 'Admin cannot remove themselves.' };
  }

  const { error } = await supabase
    .from('pool_members')
    .delete()
    .eq('pool_id', poolId)
    .eq('user_id', memberId);

  return { success: !error, error: error?.message ?? null };
}

// ---- purchaseSlots ----
export async function purchaseSlots(
  adminId: string,
  poolId: string,
  additionalSlots: number
): Promise<{ success: boolean; error: string | null }> {
  const { data: ent } = await supabase
    .from('entitlements')
    .select('id, extra_slots')
    .eq('user_id', adminId)
    .eq('pool_id', poolId)
    .maybeSingle();

  if (!ent) return { success: false, error: 'Entitlement not found.' };

  const { error } = await supabase
    .from('entitlements')
    .update({
      extra_slots: ent.extra_slots + additionalSlots,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ent.id);

  if (error) return { success: false, error: error.message };

  // Refresh pool max_members
  const { data: updated } = await supabase
    .from('entitlements')
    .select('total_slots')
    .eq('id', ent.id)
    .single();

  if (updated?.total_slots) {
    await supabase
      .from('pools')
      .update({ max_members: updated.total_slots })
      .eq('id', poolId);
  }

  return { success: true, error: null };
}

// ---- getPoolMembers ----
export async function getPoolMembers(poolId: string): Promise<PoolMember[]> {
  const { data } = await supabase
    .from('pool_members')
    .select('*, profile:profiles(*)')
    .eq('pool_id', poolId)
    .order('joined_at', { ascending: true });

  return (data ?? []) as PoolMember[];
}

// ---- listMyPools ----
export async function listMyPools(userId: string): Promise<Pool[]> {
  const { data } = await supabase
    .from('pool_members')
    .select(`
      role,
      pools (
        id, name, admin_id, invite_token, prediction_deadline,
        max_members, is_active, created_at, updated_at
      )
    `)
    .eq('user_id', userId);

  return ((data ?? [])
    .map((d: any) => d.pools as Pool)
    .filter(Boolean));
}
