import type { ProductStatus, ProductType } from '../enums';

/**
 * Variante de un producto (`ProductVariantDto`).
 *
 * El identificador útil para inventario y carrito es el de la VARIANTE, no el
 * del producto (riesgo FR-03, Frontend-Adapters §3.3).
 */
export interface ProductVariant {
  id: string;
  sku: string;
  canBeSold: boolean;
}

/**
 * Ficha de producto (`ProductDto`).
 *
 * Origen: `backend/Zentric.Application/Catalog/Queries/GetProductsQuery.cs`.
 * `price` es un decimal con dos decimales (§3.5) y `type`/`status` viajan como
 * nombre de enum (ADR-0012).
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
}

/** Atributo de una variante (`VariantAttributeDto`). */
export interface VariantAttribute {
  name: string;
  value: string;
}

/** Variante a dar de alta (`CreateProductVariantDto`). */
export interface CreateProductVariantInput {
  sku: string;
  attributes: VariantAttribute[];
}

/**
 * Alta de producto (`CreateProductCommand`).
 *
 * Q-21b: el Vendedor es el llamante y un `vendorId` en el cuerpo se descarta
 * (registrar a nombre de otro corrompería el split de facturación, Q-18), así
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
}

/**
 * Identificadores devueltos por el alta (`CreatedProductDto`, CAT-01).
 *
 * El backend entrega también los `variantIds` para que el Vendedor dé de alta
 * stock sin releer el producto; el identificador para inventario/carrito es el
 * de la variante (FR-03).
 */
export interface CreatedProduct {
  productId: string;
  variantIds: string[];
}

/** Parámetros de consulta paginada del catálogo */
export interface ListProductsPagedParams {
  vendorId?: string;
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

