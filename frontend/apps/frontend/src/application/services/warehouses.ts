import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateWarehouseInput, Warehouse, ZentricApiPort } from '../../domain';
import { queryKeys } from './queryKeys';
import { resolveApi } from './apiContext';

/**
 * Hook de consulta para listar bodegas físicas (Frontend-Domain-Services §3.2).
 */
export function useWarehousesQuery(vendorId?: string, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.warehouses.list({ vendorId }),
    queryFn: () => resolveApi(api).listWarehouses(vendorId),
    staleTime: 60_000,
  });
}

/**
 * Hook de consulta para obtener ficha técnica de una bodega por id.
 */
export function useWarehouseQuery(id: string, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.warehouses.detail(id),
    queryFn: () => resolveApi(api).getWarehouseById(id),
    enabled: Boolean(id),
  });
}

/**
 * Hook de mutación para registrar una nueva bodega.
 */
export function useCreateWarehouseMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWarehouseInput) => resolveApi(api).createWarehouse(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all });
    },
  });
}

// ── Clases de servicio heredadas ──────────────────────────────────────────

export class ConsultarBodegasService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(): Promise<Warehouse[]> {
    return this.api.listWarehouses();
  }
}

export class RegistrarBodegaService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(input: CreateWarehouseInput): Promise<string> {
    return this.api.createWarehouse(input);
  }
}
