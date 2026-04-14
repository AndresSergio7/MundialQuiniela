import { supabase } from '@/lib/supabase';
import type { Pool, PoolMember } from '@/types';

// ---- createPool ----
export async function createPool(
  adminId: string,
  name: string
): Promise<{ pool: Pool | null; error: string | null }> {
  const { data: ent, error: entError } = await supabase
    .from('entitlements')
    .select('has_app_access, total_slots')
    .eq('user_id', adminId)
    .is('pool_id', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (entError) {
    return { pool: null, error: 'Unable to verify app access. Please try again.' };
  }

  if (!ent?.has_app_access) {
    return { pool: null, error: 'Purchase required to create a pool.' };
  }

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

  const { error: memberError } = await supabase.from('pool_members').insert({
    pool_id: pool.id,
    user_id: adminId,
    role: 'admin',
  });

  if (memberError) {
    return { pool: null, error: memberError.message };
  }

  const { error: entitlementError } = await supabase.from('entitlements').upsert({
    user_id: adminId,
    pool_id: pool.id,
    has_app_access: true,
    base_slots: 10,
    extra_slots: 0,
  });

  if (entitlementError) {
    return { pool: null, error: entitlementError.message };
  }

  return { pool: pool as Pool, error: null };
}

// ---- joinPool ----
export async function joinPool(
  userId: string,
  poolId: string
): Promise<{ success: boolean; error: string | null }> {
  const { data: pool, error: poolError } = await supabase
    .from('pools')
    .select('id, is_active, max_members')
    .eq('id', poolId)
    .single();

  if (poolError || !pool) {
    return { success: false, error: 'Pool not found.' };
  }

  if (!pool.is_active) {
    return { success: false, error: 'Pool is not active.' };
  }

  const { count, error: countError } = await supabase
    .from('pool_members')
    .select('*', { count: 'exact', head: true })
    .eq('pool_id', poolId);

  if (countError) {
    return { success: false, error: countError.message };
  }

  if ((count ?? 0) >= pool.max_members) {
    return { success: false, error: 'Pool is full. Admin must purchase more slots.' };
  }

  const { data: existing, error: existingError } = await supabase
    .from('pool_members')
    .select('id')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: existingError.message };
  }

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
  const { data: pool, error: poolError } = await supabase
    .from('pools')
    .select('admin_id')
    .eq('id', poolId)
    .single();

  if (poolError || !pool) {
    return { success: false, error: 'Pool not found.' };
  }

  if (pool.admin_id !== adminId) {
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
  const { data: ent, error: entError } = await supabase
    .from('entitlements')
    .select('extra_slots')
    .eq('user_id', adminId)
    .eq('pool_id', poolId)
    .single();

  if (entError || !ent) {
    return { success: false, error: entError?.message ?? 'Entitlement not found.' };
  }

  const { error: updateError } = await supabase
    .from('entitlements')
    .update({
      extra_slots: (ent.extra_slots ?? 0) + additionalSlots,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', adminId)
    .eq('pool_id', poolId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const { data: updatedEnt, error: updatedEntError } = await supabase
    .from('entitlements')
    .select('total_slots')
    .eq('user_id', adminId)
    .eq('pool_id', poolId)
    .single();

  if (updatedEntError) {
    return { success: false, error: updatedEntError.message };
  }

  if (updatedEnt?.total_slots) {
    const { error: poolUpdateError } = await supabase
      .from('pools')
      .update({ max_members: updatedEnt.total_slots })
      .eq('id', poolId);

    if (poolUpdateError) {
      return { success: false, error: poolUpdateError.message };
    }
  }

  return { success: true, error: null };
}

// ---- getPoolMembers ----
export async function getPoolMembers(poolId: string): Promise<PoolMember[]> {
  const { data, error } = await supabase
    .from('pool_members')
    .select('*, profile:profiles(*)')
    .eq('pool_id', poolId)
    .order('joined_at', { ascending: true });

  if (error) throw error;

  return (data ?? []) as PoolMember[];
}

// ---- listMyPools ----
export async function listMyPools(userId: string): Promise<Pool[]> {
  const { data, error } = await supabase
    .from('pool_members')
    .select(`
      pool_id,
      role,
      pools!inner (
        id,
        name,
        admin_id,
        invite_token,
        prediction_deadline,
        max_members,
        is_active,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => row.pools as Pool);
}
