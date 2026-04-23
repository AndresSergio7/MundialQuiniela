import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { fetchStandings } from '@/services/standings.service';

export function useStandings(poolId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.standings.byPool(poolId ?? ''),
    queryFn: () => fetchStandings(poolId!),
    enabled: !!poolId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}
