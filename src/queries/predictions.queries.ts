import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import {
  fetchPredictions,
  fetchSubmission,
  savePredictions,
  submitQuiniela,
} from '@/services/predictions.service';
import type { PredictionMap } from '@/types';

export function usePredictions(poolId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.predictions.byPool(poolId ?? '', userId ?? ''),
    queryFn: () => fetchPredictions(poolId!, userId!),
    enabled: !!poolId && !!userId,
  });
}

export function useSubmission(poolId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.submissions.byPool(poolId ?? '', userId ?? ''),
    queryFn: () => fetchSubmission(poolId!, userId!),
    enabled: !!poolId && !!userId,
  });
}

export function useSavePredictions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      poolId,
      userId,
      scores,
    }: {
      poolId: string;
      userId: string;
      scores: PredictionMap;
    }) => savePredictions(poolId, userId, scores),
    onSuccess: (_, { poolId, userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.predictions.byPool(poolId, userId),
      });
    },
  });
}

export function useSubmitQuiniela() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ poolId, userId }: { poolId: string; userId: string }) =>
      submitQuiniela(poolId, userId),
    onSuccess: (_, { poolId, userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.submissions.byPool(poolId, userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.standings.byPool(poolId),
      });
    },
  });
}
