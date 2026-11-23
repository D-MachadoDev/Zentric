import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddStockInput,
  AdjustInventoryInput,
  AdjustInventoryResult,
  Inventory,
  ListInventoriesPagedParams,
  ZentricApiPort,
} from '../types';
import { queryKeys } from './queryKeys';
import { resolveApi } from './apiContext';

/**
 * Hook de consulta para listar inventario consolidado (sin paginar - legacy).
 */
export function useInventoriesQuery(api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.inventories.list(),
    queryFn: () => resolveApi(api).listInventories(),
    staleTime: 30_000,
  });
}

/**
 * Hook de consulta para listar inventario paginado (server-side).
 * El backend pagina; el frontend solo renderiza.
 */
export function useInventoriesPagedQuery(
  params?: ListInventoriesPagedParams,
  api?: ZentricApiPort,
) {
  return useQuery({
    queryKey: queryKeys.inventories.listPaged(params),
    queryFn: () => resolveApi(api).listInventoriesPaged(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
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
 * Hook de mutación para ajuste físico de inventario (AD).
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

/**
 * Hook de mutación para eliminar logicamente un registro de inventario.
 * Invalida ['inventories'].
 */
export function useDeleteInventoryMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string): Promise<void> => resolveApi(api).deleteInventory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventories.all });
    },
  });
}

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
