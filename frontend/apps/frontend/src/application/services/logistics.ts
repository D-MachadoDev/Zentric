import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CancelGhostStockInput,
  CreateFulfillmentInput,
  FulfillmentOrder,
  FulfillmentStatus,
  ZentricApiPort,
} from '../../domain';
import { queryKeys } from './queryKeys';
import { resolveApi } from './apiContext';

/**
 * Hook de consulta para listar órdenes de fulfillment.
 */
export function useFulfillmentsQuery(status?: FulfillmentStatus | string, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.fulfillments.list({ status }),
    queryFn: () => resolveApi(api).listFulfillments(status),
    staleTime: 30_000,
  });
}

/**
 * Hook de consulta para obtener el detalle de un despacho por id.
 */
export function useFulfillmentQuery(id: string, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.fulfillments.detail(id),
    queryFn: () => resolveApi(api).getFulfillmentById(id),
    enabled: Boolean(id),
  });
}

/**
 * Hook de mutación para crear una orden de fulfillment.
 */
export function useCreateFulfillmentMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFulfillmentInput) => resolveApi(api).createFulfillment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillments.all });
    },
  });
}

/**
 * Hook de mutación para empacar un despacho (PendingPack -> Packed).
 */
export function usePackFulfillmentMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resolveApi(api).packFulfillment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillments.all });
    },
  });
}

/**
 * Hook de mutación para despachar un fulfillment (Packed -> Dispatched).
 * Invalida ['fulfillments'], ['orders'] y ['inventories'].
 */
export function useDispatchFulfillmentMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resolveApi(api).dispatchFulfillment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventories.all });
    },
  });
}

/**
 * Hook de mutación para entregar un despacho (Dispatched -> Delivered).
 * Invalida ['fulfillments'] y ['orders'].
 */
export function useDeliverFulfillmentMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resolveApi(api).deliverFulfillment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

/**
 * Hook de mutación para cancelar un despacho por quiebre de stock fantasma.
 * Invalida ['fulfillments'], ['orders'], ['inventories'] y ['returns'].
 */
export function useCancelGhostStockMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CancelGhostStockInput) => resolveApi(api).cancelGhostStock(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all });
    },
  });
}

// ── Clases de servicio heredadas ──────────────────────────────────────────

export class CrearDespachoService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(input: CreateFulfillmentInput): Promise<string> {
    return this.api.createFulfillment(input);
  }
}

export class ConsultarDespachosService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(status?: string): Promise<FulfillmentOrder[]> {
    return this.api.listFulfillments(status);
  }
}

export class ConsultarDespachoService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(id: string): Promise<FulfillmentOrder> {
    return this.api.getFulfillmentById(id);
  }
}

export class EmpacarDespachoService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(id: string): Promise<void> {
    return this.api.packFulfillment(id);
  }
}

export class DespacharDespachoService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(id: string): Promise<void> {
    return this.api.dispatchFulfillment(id);
  }
}

export class EntregarDespachoService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(id: string): Promise<void> {
    return this.api.deliverFulfillment(id);
  }
}

export class CancelarPorStockFantasmaService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(input: CancelGhostStockInput): Promise<boolean> {
    return this.api.cancelGhostStock(input);
  }
}
