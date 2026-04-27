import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import type { Pool, PoolMember } from '@/types';

type PoolMemberPoolsRow = {
  pools: Pool | Pool[] | null;
};

export async function fetchPools(userId: string): Promise<Pool[]> {
  const { data, error } = await supabase
    .from('pool_members')
    .select(
      `
        pools (*)
      `,
    )
    .eq('user_id', userId);

  if (error) throw new AppError('FETCH_POOLS_FAILED', error.message);

  const fromMembers = ((data ?? []) as PoolMemberPoolsRow[])
    .flatMap((row) => {
      if (!row.pools) return [];
      return Array.isArray(row.pools) ? row.pools : [row.pools];
    })
    .filter(Boolean) as Pool[];

  const seen = new Set(fromMembers.map((p) => p.id));

  // Pools donde eres admin pero no aparecías en pool_members (RLS / bug de flujo).
  // Tras migración 011 la SELECT por admin_id funciona; aquí reinsertamos miembro si falta.
  const { data: ownedPools, error: ownedErr } = await supabase
    .from('pools')
    .select('*')
    .eq('admin_id', userId);

  if (!ownedErr && ownedPools?.length) {
    for (const p of ownedPools as Pool[]) {
      if (seen.has(p.id)) continue;
      const { error: insErr } = await supabase.from('pool_members').insert({
        pool_id: p.id,
        user_id: userId,
        role: 'admin',
      });
      if (!insErr) {
        fromMembers.push(p);
        seen.add(p.id);
      }
    }
  }

  return fromMembers;
}

export async function fetchPoolById(poolId: string): Promise<Pool> {
  const { data, error } = await supabase.from('pools').select('*').eq('id', poolId).single();
  if (error) throw new AppError('FETCH_POOL_FAILED', error.message);
  return data as Pool;
}

export async function createPool(params: {
  name: string;
  adminId: string;
  entitlementId?: string;
}): Promise<Pool> {
  let entitlement: { id: string; has_app_access: boolean; base_slots: number } | null = null;

  if (params.entitlementId) {
    const { data, error } = await supabase
      .from('entitlements')
      .select('id, has_app_access, base_slots')
      .eq('user_id', params.adminId)
      .is('pool_id', null)
      .eq('has_app_access', true)
      .eq('id', params.entitlementId)
      .maybeSingle();

    if (error) throw new AppError('FETCH_ENTITLEMENT_FAILED', error.message);
    if (!data?.has_app_access) throw new AppError('PURCHASE_REQUIRED', 'Purchase required.');
    entitlement = data;
  } else {
    const { data, error } = await supabase
      .from('entitlements')
      .select('id, has_app_access, base_slots')
      .eq('user_id', params.adminId)
      .is('pool_id', null)
      .eq('has_app_access', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw new AppError('FETCH_ENTITLEMENT_FAILED', error.message);
    if (data?.has_app_access) entitlement = data;
  }

  const { data: pool, error: poolError } = await supabase
    .from('pools')
    .insert({
      name: params.name,
      admin_id: params.adminId,
      max_members: entitlement?.base_slots ?? 1,
    })
    .select()
    .single();
  if (poolError) throw new AppError('CREATE_POOL_FAILED', poolError.message);

  const { error: memberError } = await supabase.from('pool_members').insert({
    pool_id: pool.id,
    user_id: params.adminId,
    role: 'admin',
  });
  if (memberError) throw new AppError('CREATE_POOL_MEMBER_FAILED', memberError.message);

  if (entitlement) {
    const { error: entitlementUpdateError } = await supabase
      .from('entitlements')
      .update({ pool_id: pool.id, updated_at: new Date().toISOString() })
      .eq('id', entitlement.id);
    if (entitlementUpdateError) {
      throw new AppError('CONSUME_ENTITLEMENT_FAILED', entitlementUpdateError.message);
    }
  }

  return pool as Pool;
}

export async function deletePool(poolId: string): Promise<void> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('delete_pool', {
    p_pool_id: poolId,
  });

  if (!rpcError) {
    const result = rpcData as { success?: boolean; error?: string | null } | null;
    if (result?.success === false) {
      throw new AppError('DELETE_POOL_FAILED', result.error ?? 'No se pudo eliminar la quiniela.');
    }
    return;
  }

  if (!rpcError.message.includes('Could not find the function')) {
    throw new AppError('DELETE_POOL_FAILED', rpcError.message);
  }

  const { data: deletedRows, error } = await supabase
    .from('pools')
    .delete()
    .eq('id', poolId)
    .select('id');

  if (error) throw new AppError('DELETE_POOL_FAILED', error.message);
  if (!deletedRows?.length) {
    throw new AppError(
      'DELETE_POOL_FAILED',
      'No se pudo eliminar la quiniela. Verifica permisos RLS o despliega el RPC delete_pool.',
    );
  }
}

export async function joinPool(poolId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('pool_members')
    .insert({ pool_id: poolId, user_id: userId, role: 'member' });
  if (error) throw new AppError('JOIN_POOL_FAILED', error.message);
}

export async function createPoolLegacy(
  adminId: string,
  name: string,
  entitlementId?: string,
): Promise<{ pool: Pool | null; error: string | null }> {
  try {
    const pool = await createPool({ adminId, name, entitlementId });
    return { pool, error: null };
  } catch (error) {
    return {
      pool: null,
      error: error instanceof AppError ? error.message : 'Failed to create pool.',
    };
  }
}

export async function deletePoolByUser(
  adminId: string,
  poolId: string,
): Promise<{ error: string | null }> {
  try {
    const { data: pool, error: poolError } = await supabase
      .from('pools')
      .select('admin_id')
      .eq('id', poolId)
      .maybeSingle();
    if (poolError) throw new AppError('FETCH_POOL_FAILED', poolError.message);
    if (!pool) return { error: 'Pool not found.' };
    if (pool.admin_id !== adminId) return { error: 'Only the admin can delete this pool.' };

    await deletePool(poolId);
    return { error: null };
  } catch (error) {
    return { error: error instanceof AppError ? error.message : 'Failed to delete pool.' };
  }
}

export const deletePoolLegacy = deletePoolByUser;

export async function leavePool(
  userId: string,
  poolId: string,
): Promise<{ error: string | null }> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('leave_pool', {
    p_pool_id: poolId,
  });

  if (!rpcError) {
    const result = rpcData as { success?: boolean; error?: string | null } | null;
    return { error: result?.error ?? null };
  }

  if (!rpcError.message.includes('Could not find the function')) {
    return { error: rpcError.message };
  }

  const { data: member, error: memberError } = await supabase
    .from('pool_members')
    .select('role')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .maybeSingle();

  if (memberError) return { error: memberError.message };
  if (!member) return { error: 'You are not a member of this pool.' };
  if (member.role === 'admin') return { error: 'Admins cannot leave their own pool. Delete it instead.' };

  const { data: deletedRows, error } = await supabase
    .from('pool_members')
    .delete()
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .select('id');

  if (error) return { error: error.message };
  if (!deletedRows?.length) {
    return {
      error: 'No se pudo salir de la quiniela. Verifica permisos RLS o despliega el RPC leave_pool.',
    };
  }
  return { error: null };
}

export async function removeMember(
  adminId: string,
  poolId: string,
  memberId: string,
): Promise<{ success: boolean; error: string | null }> {
  const { data: pool, error: poolError } = await supabase
    .from('pools')
    .select('admin_id')
    .eq('id', poolId)
    .maybeSingle();
  if (poolError) return { success: false, error: poolError.message };
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

export async function getPoolMembers(poolId: string): Promise<PoolMember[]> {
  const { data, error } = await supabase
    .from('pool_members')
    .select('*, profile:profiles(*)')
    .eq('pool_id', poolId)
    .order('joined_at', { ascending: true });
  if (error) throw new AppError('GET_POOL_MEMBERS_FAILED', error.message);
  return (data ?? []) as PoolMember[];
}

export const listMyPools = fetchPools;

export async function updatePoolNotes(
  poolId: string,
  notes: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('pools')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', poolId);
  return { error: error?.message ?? null };
}

export async function updateMemberPaidStatus(
  poolId: string,
  userId: string,
  isPaid: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('pool_members')
    .update({ is_paid: isPaid })
    .eq('pool_id', poolId)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}
