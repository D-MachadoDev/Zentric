import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateProductInput,
  CreateProductVariantInput,
  UpdateProductInput,
  CreatedProduct,
  ListProductsPagedParams,
  ZentricApiPort,
} from '../types';

import { queryKeys } from './queryKeys';
import { resolveApi, getDefaultSession } from './apiContext';

const DEFAULT_BASE_URL = 'http://localhost:15433';

/**
 * Resuelve la base URL del backend igual que el HttpClient central, para que
 * las llamadas de reseñas funcionen también fuera del proxy de desarrollo.
 */
function resolveApiBaseUrl(): string {
  if (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { __ZENTRIC_API_BASE_URL__?: string }).__ZENTRIC_API_BASE_URL__ ===
      'string'
  ) {
    return (window as unknown as { __ZENTRIC_API_BASE_URL__: string }).__ZENTRIC_API_BASE_URL__;
  }
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  return (env?.VITE_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/u, '');
}

/**
 * Hook de consulta para listar productos paginados.
 * staleTime: 5 min para optimización de rendimiento y red (Sección 7).
 */
export function useProductsPagedQuery(params?: ListProductsPagedParams, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.products.paged(params),
    queryFn: ({ signal }) => resolveApi(api).listProductsPaged(params, signal),
    staleTime: 5 * 60_000,
  });
}

/**
 * Hook de consulta de las categorías reales del marketplace (S1).
 *
 * Fuente única de categorías: el backend sólo devuelve las que tienen >= 1
 * producto publicado, así que la UI no debe filtrar ni inventar categorías.
 * staleTime: 5 min para optimización de rendimiento y red (Sección 7).
 */
export function useCategoriesQuery(api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: ({ signal }) => resolveApi(api).listCategories(signal),
    staleTime: 5 * 60_000,
  });
}

/**
 * Hook de consulta de los productos destacados del hero (S2).
 *
 * El hero se compone con productos reales; `count` por defecto 6.
 * staleTime: 5 min para optimización de rendimiento y red (Sección 7).
 */
export function useHeroProductsQuery(count = 6, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.heroProducts.list(count),
    queryFn: () => resolveApi(api).listHeroProducts(count),
    staleTime: 5 * 60_000,
  });
}

/**
 * Hook de consulta para obtener el detalle de un producto por id.
 * staleTime: 5 min para optimización de rendimiento y red (Sección 7).
 */
export function useProductQuery(id: string, api?: ZentricApiPort) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => resolveApi(api).getProductById(id),
    staleTime: 5 * 60_000,
    enabled: Boolean(id),
  });
}

/**
 * Hook de consulta para obtener los productos vistos recientemente.
 */
export function useRecentlyViewedQuery(
  maxItems = 20,
  api?: ZentricApiPort,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['recentlyViewed', maxItems],
    queryFn: () => resolveApi(api).getRecentlyViewed(maxItems),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
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
 * Hook de mutación para agregar una variante (SKU) con precio propio a un producto existente.
 */
export function useAddProductVariantMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      input,
    }: {
      productId: string;
      input: CreateProductVariantInput;
    }): Promise<string> => resolveApi(api).addProductVariant(productId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}


/**
 * Hook de mutación para registrar la visualización de un producto.
 * Solo para usuarios autenticados; invitados usan localStorage.
 */
export function useTrackProductViewMutation(api?: ZentricApiPort) {
  return useMutation({
    mutationFn: (productId: string) => resolveApi(api).trackProductView(productId),
  });
}

/**
 * Hook de mutación para actualizar un producto del catálogo comercial.
 */
export function useUpdateProductMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, input }: { productId: string; input: UpdateProductInput }) =>
      resolveApi(api).updateProduct(productId, input),
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

export interface ProductReviewItem {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  buyerName?: string;
  imageUrls?: string[];
}

export interface SubmitProductReviewInput {
  productId: string;
  rating: number;
  comment?: string;
  orderId?: string;
  buyerName?: string;
  imageUrls?: string[];
}

/**
 * Consulta de reseñas públicas de un producto (GET /api/products/{id}/reviews).
 */
export function useProductReviewsQuery(productId: string) {
  return useQuery({
    queryKey: queryKeys.products.reviews(productId),
    queryFn: async (): Promise<ProductReviewItem[]> => {
      if (!productId) return [];
      try {
        const response = await fetch(
          `${resolveApiBaseUrl()}/api/products/${encodeURIComponent(productId)}/reviews`,
        );
        if (!response.ok) return [];
        return (await response.json()) ?? [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(productId),
  });
}

/**
 * Hook de mutación para calificar y enviar reseña de un producto (POST /api/products/{id}/reviews).
 * Invalida la consulta del producto para refrescar el promedio en vivo y aplica actualización optimista.
 */
export function useSubmitProductReviewMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      rating,
      comment,
      orderId,
      buyerName,
      imageUrls,
    }: SubmitProductReviewInput): Promise<{ rating: number; averageRating?: number; reviewsCount?: number }> => {
      const resolvedApi = resolveApi(api);
      if (
        'submitProductReview' in resolvedApi &&
        typeof (resolvedApi as Record<string, unknown>).submitProductReview === 'function'
      ) {
        return (resolvedApi as unknown as { submitProductReview: (id: string, data: unknown) => Promise<{ rating: number; averageRating?: number; reviewsCount?: number }> }).submitProductReview(productId, { rating, comment, orderId, buyerName, imageUrls });
      }

      const token = getDefaultSession()?.getAccessToken();
      const response = await fetch(
        `${resolveApiBaseUrl()}/api/products/${encodeURIComponent(productId)}/reviews`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ rating, comment, orderId, buyerName, imageUrls }),
        },
      );

      if (!response.ok) {
        let errorDetail = 'Error al enviar la reseña';
        try {
          const problem = await response.json();
          errorDetail = problem.detail || problem.message || errorDetail;
        } catch {
          // ignore parsing error
        }
        throw new Error(errorDetail);
      }

      return response.json().catch(() => ({ rating }));
    },
    onSuccess: (result, variables) => {
      queryClient.setQueryData(queryKeys.products.detail(variables.productId), (old: any) => {
        if (!old) return old;
        const currentCount = old.reviewsCount ?? 0;
        const currentAvg = old.averageRating ?? 0;
        const newCount = currentCount + 1;
        const newAvg = Number(((currentAvg * currentCount + variables.rating) / newCount).toFixed(1));
        return {
          ...old,
          averageRating: result?.averageRating ?? newAvg,
          reviewsCount: result?.reviewsCount ?? newCount,
        };
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.reviews(variables.productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}






