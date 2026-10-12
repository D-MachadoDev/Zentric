import type { AddStockInput, Inventory, ZentricApiPort } from '../../domain';

/**
 * Casos de uso de inventario (Frontend-Domain-Services §2.3).
 *
 * La validación de `cantidad > 0` (INV-01) vive en el esquema Zod del formulario,
 * que ofrece el feedback inmediato; la autoridad sigue siendo el servidor.
 */

export class IngresarExistenciasService {
  constructor(private readonly api: ZentricApiPort) {}

  /** `POST /api/inventories/stock`. */
  ejecutar(input: AddStockInput): Promise<string> {
    return this.api.addStock(input);
  }
}

export class ConsultarInventarioService {
  constructor(private readonly api: ZentricApiPort) {}

  /**
   * `GET /api/inventories/{variantId}`. El servidor separa disponible y
   * reservado; el stock nunca se recalcula en el cliente.
   */
  ejecutar(variantId: string): Promise<Inventory[]> {
    return this.api.listInventoryByVariant(variantId);
  }
}
