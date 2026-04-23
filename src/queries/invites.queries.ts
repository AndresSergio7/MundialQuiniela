import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { acceptInvite, createInvite, fetchInvites } from '@/services/invites.service';

export function useInvites(poolId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invites.byPool(poolId ?? ''),
    queryFn: () => fetchInvites(poolId!),
    enabled: !!poolId,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (poolId: string) => createInvite(poolId),
    onSuccess: (_, poolId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.byPool(poolId) });
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ token, userId }: { token: string; userId: string }) => acceptInvite(token, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pools.all });
    },
  });
}
