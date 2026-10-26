import type { ProductStatus, ProductType } from '../enums';

/**
 * Variante de un producto (`ProductVariantDto`).
 *
 * El identificador útil para inventario y carrito es el de la VARIANTE, no el
 * del producto (riesgo F, Frontend-Adapters sección 3.3).
 */
export interface ProductVariant {
  id: string;
  sku: string;
  canBeSold: boolean;
  availableStock?: number;
  attributes?: VariantAttribute[];
  price?: number;
}

/**
 * Ficha de producto (`ProductDto`).
 *
 * Origen: `backend/Zentric.Application/Catalog/Queries/GetProductsQuery.cs`.
 * `price` es un decimal con dos decimales (sección 3.5) y `type`/`status` viajan como
 * nombre de enum (AD).
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  vendorId: string;
  type: ProductType;
  status: ProductStatus;
  variants: ProductVariant[];
  /** ISO-8601 (DateTime). */
  createdAt: string;
  imageUrl?: string | null;
  /** Galería del producto: fotos propias en distintos ángulos, en orden de presentación. */
  imageUrls?: string[] | null;
  category?: string;
}

export interface UpdateProductInput {
  name: string;
  description: string;
  priceAmount: number;
  priceCurrency: string;
  imageUrl?: string | null;
  category?: string;
}

export interface VariantAttribute {
  name: string;
  value: string;
}

/** Variante a dar de alta (`CreateProductVariantDto`). */
export interface CreateProductVariantInput {
  sku: string;
  attributes: VariantAttribute[];
  priceAmount?: number;
}

/**
 * Alta de producto (`CreateProductCommand`).
 *
 * el Vendedor es el llamante y un `vendorId` en el cuerpo se descarta
 * (registrar a nombre de otro corrompería el split de facturación, ), así
 * que el cliente NO lo envía.
 */
export interface CreateProductInput {
  name: string;
  description: string;
  /** El backend lo llama `priceAmount`. */
  priceAmount: number;
  /** El backend lo llama `priceCurrency` (ISO-4217). */
  priceCurrency: string;
  type: ProductType;
  variants?: CreateProductVariantInput[];
  imageUrl?: string | null;
  category?: string;
}

/**
 * Identificadores devueltos por el alta (`CreatedProductDto`, CA).
 *
 * El backend entrega también los `variantIds` para que el Vendedor dé de alta
 * stock sin releer el producto; el identificador para inventario/carrito es el
 * de la variante (F).
 */
export interface CreatedProduct {
  productId: string;
  variantIds: string[];
}

/**
 * Parámetros de consulta paginada del catálogo.
 *
 * `search`, `sort` y `type` operan sobre TODO el catálogo en el servidor (S3):
 * el filtrado/ordenamiento debe ocurrir en el backend, nunca sobre la página
 * activa en el cliente. Todos son opcionales para no alterar el comportamiento
 * previo (ausente = sin filtro / orden actual `CreatedAt` asc).
 *
 * `sort` y `type` viajan con los valores exactos que espera el backend
 * (`relevance | price-asc | price-desc` y `Physical | Digital`; ADenvía
 * el NOMBRE del enum, nunca el índice).
 */
export interface ListProductsPagedParams {
  vendorId?: string;
  page?: number;
  size?: number;
  category?: string;
  search?: string;
  sort?: 'relevance' | 'price-asc' | 'price-desc';
  type?: ProductType;
}

/**
 * Parámetros de consulta paginada de facturas.
 */
export interface ListInvoicesPagedParams {
  page?: number;
  size?: number;
}

/**
 * Parámetros de consulta paginada de bodegas.
 */
export interface ListWarehousesPagedParams {
  vendorId?: string;
  page?: number;
  size?: number;
}

/**
 * Parámetros de consulta paginada de inventarios.
 */
export interface ListInventoriesPagedParams {
  page?: number;
  size?: number;
}

/** Envoltorio estándar de paginación del backend */
export interface PagedResult<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

