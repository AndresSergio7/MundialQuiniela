import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { usePoolStore } from '@/store/pool';
import { useAuthStore } from '@/store/auth';
import type { Pool, PoolWithMeta, PoolMember, Standing } from '@/types';

export function usePool() {
  const { currentPool, pools, setCurrentPool, setPools } = usePoolStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('pool_members')
      .select(`
        role,
        pools (
          id, name, admin_id, invite_token, prediction_deadline,
          max_members, is_active, created_at, updated_at
        )
      `)
      .eq('user_id', user.id);

    if (err) {
      setError(err.message);
    } else if (data) {
      const poolList = data
        .map((d) => d.pools as Pool)
        .filter(Boolean);
      setPools(poolList);
    }
    setLoading(false);
  }, [user]);

  const fetchMembers = useCallback(async (poolId: string): Promise<PoolMember[]> => {
    const { data, error: err } = await supabase
      .from('pool_members')
      .select('*, profile:profiles(*)')
      .eq('pool_id', poolId);

    if (err) return [];
    return (data ?? []) as PoolMember[];
  }, []);

  const fetchStandings = useCallback(async (poolId: string): Promise<Standing[]> => {
    const { data, error: err } = await supabase
      .from('standings')
      .select('*, profile:profiles(*)')
      .eq('pool_id', poolId)
      .order('rank', { ascending: true });

    if (err) return [];
    return (data ?? []) as Standing[];
  }, []);

  return {
    currentPool,
    pools,
    loading,
    error,
    setCurrentPool,
    fetchPools,
    fetchMembers,
    fetchStandings,
  };
}
