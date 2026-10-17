import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  InspectReturnInput,
  RequestReturnInput,
  ReturnRequest,
  ReturnStatus,
  ZentricApiPort,
} from '../../domain';
import { queryKeys } from './queryKeys';
import { resolveApi } from './apiContext';

/**
 * Hook de consulta para listar solicitudes de devolución.
 */
export function useReturnsQuery(status?: ReturnStatus | string, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.returns.list({ status }),
    queryFn: () => resolveApi(api).listReturns(status),
    staleTime: 30_000,
  });
}

/**
 * Hook de consulta para obtener el detalle de una devolución por id.
 */
export function useReturnQuery(id: string, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.returns.detail(id),
    queryFn: () => resolveApi(api).getReturnById(id),
    enabled: Boolean(id),
  });
}

/**
 * Hook de mutación para solicitar una devolución.
 * Invalida ['returns'] y ['orders'].
 */
export function useRequestReturnMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RequestReturnInput) => resolveApi(api).requestReturn(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

/**
 * Hook de mutación para dictamen de inspección técnica (Operador Logístico).
 * Invalida ['returns'].
 */
export function useInspectReturnMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InspectReturnInput }) =>
      resolveApi(api).inspectReturn(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all });
    },
  });
}

/**
 * Hook de mutación para aprobar comercialmente una devolución (Vendedor).
 * Invalida ['returns'] y ['inventories'].
 */
export function useApproveReturnMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resolveApi(api).approveReturn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventories.all });
    },
  });
}

/**
 * Hook de mutación para rechazar una solicitud de devolución.
 * Invalida ['returns'].
 */
export function useRejectReturnMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resolveApi(api).rejectReturn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all });
    },
  });
}

/**
 * Hook de mutación para reembolsar una devolución aprobada (Administrador).
 * Invalida ['returns'] y ['orders'].
 */
export function useRefundReturnMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resolveApi(api).refundReturn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

// ── Clases de servicio heredadas ──────────────────────────────────────────

export class SolicitarDevolucionService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(input: RequestReturnInput): Promise<string> {
    return this.api.requestReturn(input);
  }
}

export class InspeccionarDevolucionService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(id: string, input: InspectReturnInput): Promise<void> {
    return this.api.inspectReturn(id, input);
  }
}

export class AprobarDevolucionService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(id: string): Promise<void> {
    return this.api.approveReturn(id);
  }
}

export class ConsultarDevolucionesService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(status?: string): Promise<ReturnRequest[]> {
    return status !== undefined ? this.api.listReturns(status) : this.api.listReturns();
  }
}


export class ConsultarDevolucionService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(id: string): Promise<ReturnRequest> {
    return this.api.getReturnById(id);
  }
}

export class ReembolsarDevolucionService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(id: string): Promise<void> {
    return this.api.refundReturn(id);
  }
}
