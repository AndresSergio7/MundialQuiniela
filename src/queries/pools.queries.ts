import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import {
  createPool,
  deletePool,
  fetchPoolById,
  fetchPools,
  joinPool,
} from '@/services/pools.service';

export function usePools(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pools.byUser(userId ?? ''),
    queryFn: () => fetchPools(userId!),
    enabled: !!userId,
  });
}

export function usePool(poolId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pools.byId(poolId ?? ''),
    queryFn: () => fetchPoolById(poolId!),
    enabled: !!poolId,
  });
}

export function useCreatePool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pools.all });
    },
  });
}

export function useDeletePool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (poolId: string) => deletePool(poolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pools.all });
    },
  });
}

export function useJoinPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ poolId, userId }: { poolId: string; userId: string }) => joinPool(poolId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pools.all });
    },
  });
}
