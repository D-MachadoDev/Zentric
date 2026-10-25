import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddStockInput,
  AdjustInventoryInput,
  AdjustInventoryResult,
  Inventory,
  ZentricApiPort,
} from '../../domain';
import { queryKeys } from './queryKeys';
import { resolveApi } from './apiContext';

/**
 * Hook de consulta para listar inventario consolidado.
 */
export function useInventoriesQuery(api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.inventories.list(),
    queryFn: () => resolveApi(api).listInventories(),
    staleTime: 30_000,
  });
}

/**
 * Hook de consulta para consultar existencias por código de variante (SKU).
 */
export function useInventoryByVariantQuery(variantId: string, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.inventories.variant(variantId),
    queryFn: () => resolveApi(api).listInventoryByVariant(variantId),
    enabled: Boolean(variantId),
  });
}

/**
 * Hook de mutación para ingresar existencias de stock nuevo.
 * Invalida ['inventories'] y ['products'].
 */
export function useAddStockMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddStockInput) => resolveApi(api).addStock(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/**
 * Hook de mutación para ajuste físico de inventario (ADR-0021).
 */
export function useAdjustInventoryMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdjustInventoryInput }): Promise<AdjustInventoryResult> =>
      resolveApi(api).adjustInventory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventories.all });
    },
  });
}

// ── Clases de servicio heredadas ──────────────────────────────────────────

export class IngresarStockService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(input: AddStockInput): Promise<string> {
    return this.api.addStock(input);
  }
}

export class ConsultarStockPorVarianteService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(variantId: string): Promise<Inventory[]> {
    return this.api.listInventoryByVariant(variantId);
  }
}
