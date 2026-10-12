import type { CreateWarehouseInput, Warehouse, ZentricApiPort } from '../../domain';

/** Casos de uso de bodegas (Frontend-Domain-Services §2.8). */

export class ConsultarBodegasService {
  constructor(private readonly api: ZentricApiPort) {}

  /** `GET /api/warehouses`. El Vendedor sólo ve las suyas: lo decide el servidor. */
  ejecutar(): Promise<Warehouse[]> {
    return this.api.listWarehouses();
  }
}

export class RegistrarBodegaService {
  constructor(private readonly api: ZentricApiPort) {}

  /**
   * `POST /api/warehouses`. El cliente ofrece *feedback* inmediato de la
   * correspondencia `type`↔`vendorId` que valida el servidor
   * (`CreateWarehouseCommandValidator`); la autoridad sigue siendo el backend.
   */
  ejecutar(input: CreateWarehouseInput): Promise<string> {
    return this.api.createWarehouse(input);
  }
}
