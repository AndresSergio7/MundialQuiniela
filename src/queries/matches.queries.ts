import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { fetchMatches } from '@/services/matches.service';

export function useMatches() {
  return useQuery({
    queryKey: queryKeys.matches.all,
    queryFn: fetchMatches,
    staleTime: 1000 * 60 * 5,
  });
}
