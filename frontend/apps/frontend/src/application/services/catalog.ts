import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateProductInput,
  CreatedProduct,
  ListProductsPagedParams,
  ZentricApiPort,
} from '../../domain';

import { queryKeys } from './queryKeys';
import { resolveApi } from './apiContext';

/**
 * Hook de consulta para listar productos del catálogo.
 */
export function useProductsQuery(vendorId?: string, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.products.list({ vendorId }),
    queryFn: () => resolveApi(api).listProducts(vendorId),
    staleTime: 60_000,
  });
}

/**
 * Hook de consulta para listar productos paginados.
 */
export function useProductsPagedQuery(params?: ListProductsPagedParams, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.products.paged(params),
    queryFn: () => resolveApi(api).listProductsPaged(params),
    staleTime: 60_000,
  });
}

/**
 * Hook de consulta de las categorías reales del marketplace (S1).
 *
 * Fuente única de categorías: el backend sólo devuelve las que tienen >= 1
 * producto publicado, así que la UI no debe filtrar ni inventar categorías.
 */
export function useCategoriesQuery(api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: () => resolveApi(api).listCategories(),
    staleTime: 60_000,
  });
}

/**
 * Hook de consulta de los productos destacados del hero (S2).
 *
 * El hero se compone con productos reales; `count` por defecto 6.
 */
export function useHeroProductsQuery(count = 6, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.heroProducts.list(count),
    queryFn: () => resolveApi(api).listHeroProducts(count),
    staleTime: 60_000,
  });
}

/**
 * Hook de consulta para obtener el detalle de un producto por id.
 */
export function useProductQuery(id: string, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => resolveApi(api).getProductById(id),
    enabled: Boolean(id),
  });
}

/**
 * Hook de mutación para dar de alta un nuevo producto.
 * Retorna `{ productId, variantIds }` e invalida ['products'].
 */
export function useCreateProductMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput): Promise<CreatedProduct> =>
      resolveApi(api).createProduct(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/**
 * Hook de mutación para publicar un producto.
 */
export function usePublishProductMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => resolveApi(api).publishProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/**
 * Hook de mutación para suspender un producto del catálogo comercial.
 */
export function useSuspendProductMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => resolveApi(api).suspendProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
