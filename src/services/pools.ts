import { supabase } from '@/lib/supabase';
import type { Pool, PoolMember } from '@/types';

// ---- createPool ----
// entitlementId: when provided, consumes that exact unused purchase.
// Falls back to FIFO (oldest) if omitted.
export async function createPool(
  adminId: string,
  name: string,
  entitlementId?: string
): Promise<{ pool: Pool | null; error: string | null }> {
  let query = supabase
    .from('entitlements')
    .select('id, has_app_access, base_slots')
    .eq('user_id', adminId)
    .is('pool_id', null)
    .eq('has_app_access', true);

  if (entitlementId) {
    query = query.eq('id', entitlementId);
  } else {
    query = query.order('created_at', { ascending: true });
  }

  const { data: ent, error: entErr } = await query.limit(1).maybeSingle();

  if (entErr) {
    console.error('createPool: entitlement query error', entErr);
    return { pool: null, error: entErr.message };
  }

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
    console.error('createPool: pool insert error', error);
    return { pool: null, error: error?.message ?? 'Failed to create pool.' };
  }

  // Add admin as member
  const { error: memberErr } = await supabase.from('pool_members').insert({
    pool_id: pool.id,
    user_id: adminId,
    role: 'admin',
  });
  if (memberErr) console.error('createPool: pool_members insert error', memberErr);

  // Consume this specific entitlement by binding it to the new pool
  const { error: entUpdateErr } = await supabase
    .from('entitlements')
    .update({ pool_id: pool.id, updated_at: new Date().toISOString() })
    .eq('id', ent.id);
  if (entUpdateErr) console.error('createPool: entitlement update error', entUpdateErr);

  return { pool: pool as Pool, error: null };
}

// ---- joinPool ----
// Race-safe path: tries the join_pool_safe RPC first (SECURITY DEFINER +
// FOR UPDATE lock prevents two simultaneous joins both reading count < max).
// Falls back to direct client-side check when the RPC hasn't been deployed yet.
// To deploy the race-safe RPC run JOIN_POOL_SAFE_SQL from src/lib/testMode.ts.
export async function joinPool(
  userId: string,
  poolId: string
): Promise<{ success: boolean; error: string | null }> {
  // Try RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc('join_pool_safe', {
    p_pool_id: poolId,
  });

  if (!rpcError) {
    const result = rpcData as { success: boolean; error: string | null };
    return { success: result.success, error: result.error };
  }

  // Only fall back if the function simply doesn't exist yet
  if (!rpcError.message.includes('Could not find the function')) {
    return { success: false, error: rpcError.message };
  }

  // Fallback: client-side check (no race-condition protection)
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

// ---- deletePool ----
// Admin only: permanently deletes the pool and all associated data.
// Uses SECURITY DEFINER RPC to bypass RLS; falls back to direct query.
export async function deletePool(
  adminId: string,
  poolId: string
): Promise<{ error: string | null }> {
  // Try RPC first (SECURITY DEFINER bypasses RLS)
  const { data: rpcData, error: rpcError } = await supabase.rpc('delete_pool', {
    p_pool_id: poolId,
  });

  if (!rpcError) {
    const result = rpcData as { success: boolean; error: string | null };
    return { error: result.error };
  }

  // Fallback: direct delete (requires RLS DELETE policy for admin)
  if (!rpcError.message.includes('Could not find the function')) {
    return { error: rpcError.message };
  }

  const { data: pool } = await supabase
    .from('pools')
    .select('admin_id')
    .eq('id', poolId)
    .maybeSingle();

  if (!pool) return { error: 'Pool not found.' };
  if (pool.admin_id !== adminId) return { error: 'Only the admin can delete this pool.' };

  const { data: deleted, error } = await supabase
    .from('pools')
    .delete()
    .eq('id', poolId)
    .select('id');

  if (error) return { error: error.message };
  if (!deleted || deleted.length === 0) {
    return { error: 'No se pudo eliminar el pool. Ejecuta el SQL de permisos en tu proyecto Supabase.' };
  }
  return { error: null };
}

// ---- leavePool ----
// Member only: removes the user from the pool (does not delete it).
// Uses SECURITY DEFINER RPC to bypass RLS; falls back to direct query.
export async function leavePool(
  userId: string,
  poolId: string
): Promise<{ error: string | null }> {
  // Try RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc('leave_pool', {
    p_pool_id: poolId,
  });

  if (!rpcError) {
    const result = rpcData as { success: boolean; error: string | null };
    return { error: result.error };
  }

  if (!rpcError.message.includes('Could not find the function')) {
    return { error: rpcError.message };
  }

  // Fallback
  const { data: member } = await supabase
    .from('pool_members')
    .select('role')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!member) return { error: 'You are not a member of this pool.' };
  if (member.role === 'admin') return { error: 'Admins cannot leave their own pool. Delete it instead.' };

  const { data: deleted, error } = await supabase
    .from('pool_members')
    .delete()
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .select('id');

  if (error) return { error: error.message };
  if (!deleted || deleted.length === 0) {
    return { error: 'No se pudo salir del pool. Ejecuta el SQL de permisos en tu proyecto Supabase.' };
  }
  return { error: null };
}


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
