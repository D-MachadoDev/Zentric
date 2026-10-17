import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateProductInput,
  CreatedProduct,
  ListProductsPagedParams,
  Product,
  ZentricApiPort,
} from '../../domain';

import type { ProductoRegistrado } from '../dto';
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

// ── Clases de servicio heredadas ──────────────────────────────────────────

export class ConsultarCatalogoService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(vendorId?: string): Promise<Product[]> {
    return this.api.listProducts(vendorId);
  }
}

export class ConsultarProductoService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(id: string): Promise<Product> {
    return this.api.getProductById(id);
  }
}

export class RegistrarProductoService {
  constructor(private readonly api: ZentricApiPort) {}

  async ejecutar(input: CreateProductInput): Promise<ProductoRegistrado> {
    const created = await this.api.createProduct(input);
    const variantId = created.variantIds[0] ?? null;

    if (variantId === null) {
      return { productId: created.productId, variantId: null, sku: null };
    }

    const product = this.api.getProductById
      ? await this.api.getProductById(created.productId)
      : await this.api.getProduct(created.productId);
    const variant = product.variants.find((candidate) => candidate.id === variantId);

    return { productId: created.productId, variantId, sku: variant?.sku ?? null };
  }
}

export class PublicarProductoService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(productId: string): Promise<void> {
    return this.api.publishProduct(productId);
  }
}

export class SuspenderProductoService {
  constructor(private readonly api: ZentricApiPort) {}

  ejecutar(productId: string): Promise<void> {
    return this.api.suspendProduct(productId);
  }
}
