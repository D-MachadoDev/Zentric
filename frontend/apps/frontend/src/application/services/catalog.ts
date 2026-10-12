import type { CreateProductInput, Product, ZentricApiPort } from '../../domain';
import type { ProductoRegistrado } from '../dto';

/** Casos de uso de catálogo (Frontend-Domain-Services §2.2). */

export class ConsultarCatalogoService {
  constructor(private readonly api: ZentricApiPort) {}

  /**
   * `GET /api/catalog/products`. Con `vendorId` es la vista de gestión del dueño
   * (ve también los suspendidos); sin él es el catálogo comercial, sólo `Published` (Q-27).
   */
  ejecutar(vendorId?: string): Promise<Product[]> {
    return this.api.listProducts(vendorId);
  }
}

export class ConsultarProductoService {
  constructor(private readonly api: ZentricApiPort) {}

  /** Detalle con variantes. */
  ejecutar(id: string): Promise<Product> {
    return this.api.getProduct(id);
  }
}

export class RegistrarProductoService {
  constructor(private readonly api: ZentricApiPort) {}

  /**
   * `POST /api/catalog/products`. El identificador útil para inventario y
   * carrito es el de la VARIANTE (riesgo FR-03), que el propio alta entrega en
   * `variantIds` (CAT-01), así que no hace falta releer para obtenerlo.
   * Se relée únicamente para recuperar el `sku`, que la alta no devuelve.
   */
  async ejecutar(input: CreateProductInput): Promise<ProductoRegistrado> {
    const created = await this.api.createProduct(input);
    const variantId = created.variantIds[0] ?? null;

    // Un producto Digital puede nacer sin variantes (ADR-0003).
    if (variantId === null) {
      return { productId: created.productId, variantId: null, sku: null };
    }

    const product = await this.api.getProduct(created.productId);
    const variant = product.variants.find((candidate) => candidate.id === variantId);

    return { productId: created.productId, variantId, sku: variant?.sku ?? null };
  }
}

export class PublicarProductoService {
  constructor(private readonly api: ZentricApiPort) {}

  /** Reactiva un producto `Suspended` devolviéndolo a `Published`. */
  ejecutar(productId: string): Promise<void> {
    return this.api.publishProduct(productId);
  }
}

export class SuspenderProductoService {
  constructor(private readonly api: ZentricApiPort) {}

  /**
   * `POST /api/catalog/products/{id}/suspend` (Q-27). El producto sale del
   * catálogo comercial y el carrito lo rechaza; sólo el Vendedor puede hacerlo
   * (política `ProductManagement`).
   */
  ejecutar(productId: string): Promise<void> {
    return this.api.suspendProduct(productId);
  }
}
