// ============================================================
// POOL SERVICE
// ============================================================

import { supabase } from '@/lib/supabase';
import type { Pool, PoolMember, Entitlement } from '@/types';

// ---- createPool ----
export async function createPool(
  adminId: string,
  name: string
): Promise<{ pool: Pool | null; error: string | null }> {
  // Verify entitlement
  const { data: ent } = await supabase
    .from('entitlements')
    .select('has_app_access, total_slots')
    .eq('user_id', adminId)
    .is('pool_id', null)
    .single();

  if (!ent?.has_app_access) {
    return { pool: null, error: 'Purchase required to create a pool.' };
  }

  // Create pool
  const { data: pool, error } = await supabase
    .from('pools')
    .insert({
      name,
      admin_id: adminId,
      max_members: ent.total_slots ?? 10,
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

  // Create pool-level entitlement
  await supabase.from('entitlements').upsert({
    user_id: adminId,
    pool_id: pool.id,
    has_app_access: true,
    base_slots: 10,
    extra_slots: 0,
  });

  return { pool: pool as Pool, error: null };
}

// ---- joinPool ----
export async function joinPool(
  userId: string,
  poolId: string
): Promise<{ success: boolean; error: string | null }> {
  // Check pool exists and is active
  const { data: pool } = await supabase
    .from('pools')
    .select('id, is_active, max_members')
    .eq('id', poolId)
    .single();

  if (!pool?.is_active) {
    return { success: false, error: 'Pool is not active.' };
  }

  // Check member count
  const { count } = await supabase
    .from('pool_members')
    .select('*', { count: 'exact', head: true })
    .eq('pool_id', poolId);

  if ((count ?? 0) >= pool.max_members) {
    return { success: false, error: 'Pool is full. Admin must purchase more slots.' };
  }

  // Check not already member
  const { data: existing } = await supabase
    .from('pool_members')
    .select('id')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    return { success: false, error: 'Already a member of this pool.' };
  }

  const { error } = await supabase.from('pool_members').insert({
    pool_id: poolId,
    user_id: userId,
    role: 'member',
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// ---- removeMember ----
export async function removeMember(
  adminId: string,
  poolId: string,
  memberId: string
): Promise<{ success: boolean; error: string | null }> {
  // Verify caller is admin
  const { data: pool } = await supabase
    .from('pools')
    .select('admin_id')
    .eq('id', poolId)
    .single();

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
  const { error } = await supabase
    .from('entitlements')
    .update({
      extra_slots: supabase.rpc('increment', { x: additionalSlots }),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', adminId)
    .eq('pool_id', poolId);

  if (error) return { success: false, error: error.message };

  // Update pool max_members
  const { data: ent } = await supabase
    .from('entitlements')
    .select('total_slots')
    .eq('user_id', adminId)
    .eq('pool_id', poolId)
    .single();

  if (ent?.total_slots) {
    await supabase
      .from('pools')
      .update({ max_members: ent.total_slots })
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
