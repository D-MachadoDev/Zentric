import { useQuery } from '@tanstack/react-query';
import type { HealthStatus, ZentricApiPort } from '../../domain';
import { queryKeys } from './queryKeys';
import { resolveApi } from './apiContext';

/**
 * Hook de consulta para la sonda de disponibilidad /health.
 */
export function useHealthQuery(api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.health.all,
    queryFn: (): Promise<HealthStatus> => resolveApi(api).getHealth(),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
