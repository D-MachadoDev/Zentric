import type {
  CancelGhostStockInput,
  CreateFulfillmentInput,
  FulfillmentOrder,
  ZentricApiPort,
} from '../../domain';

/** Casos de uso de logística (Frontend-Domain-Services §2.6). */

export class ConsultarDespachosService {
  constructor(private readonly api: ZentricApiPort) {}

  /** `GET /api/logistics/fulfillments`. Lista los despachos visibles para el llamante (ADR-0017). */
  ejecutar(status?: string): Promise<FulfillmentOrder[]> {
    return status !== undefined ? this.api.listFulfillments(status) : this.api.listFulfillments();
  }
}

export class ObtenerDespachoService {
  constructor(private readonly api: ZentricApiPort) {}

  /** `GET /api/logistics/fulfillment/{id}`. Consulta detalle y paquetes de un despacho. */
  ejecutar(id: string): Promise<FulfillmentOrder> {
    return this.api.getFulfillment(id);
  }
}

export class CrearDespachoService {
  constructor(private readonly api: ZentricApiPort) {}

  /** `POST /api/logistics/fulfillment`. Crea el despacho de un pedido pagado. */
  ejecutar(input: CreateFulfillmentInput): Promise<string> {
    return this.api.createFulfillment(input);
  }
}

export class EmpacarService {
  constructor(private readonly api: ZentricApiPort) {}

  /**
   * `POST /api/logistics/fulfillment/{id}/pack`: `PendingPack` → `Packed`.
   *
   * El despacho **nace siempre en `PendingPack`**, así que sin empacar no hay
   * despacho posible (`backendSDD/Domain/07-lifecycle.md`: "Dispatch sin haber
   * empaquetado lanza excepción").
   */
  ejecutar(id: string): Promise<void> {
    return this.api.packFulfillment(id);
  }
}

export class DespacharService {
  constructor(private readonly api: ZentricApiPort) {}

  /** `POST /api/logistics/fulfillment/{id}/dispatch`: `Packed` → `Dispatched`. */
  ejecutar(id: string): Promise<void> {
    return this.api.dispatchFulfillment(id);
  }
}

export class EntregarService {
  constructor(private readonly api: ZentricApiPort) {}

  /**
   * `POST /api/logistics/fulfillment/{id}/deliver`: `Dispatched` → `Delivered`.
   * **Sólo el Operador Logístico** puede cerrar la entrega (Q-23): es un acto
   * físico en bodega, no una decisión comercial.
   */
  ejecutar(id: string): Promise<void> {
    return this.api.deliverFulfillment(id);
  }
}

export class CancelarPorQuiebreService {
  constructor(private readonly api: ZentricApiPort) {}

  /**
   * `POST /api/logistics/fulfillment/cancel-ghost-stock` (ADR-0014).
   *
   * La confirmación previa la exige la UI a través de `AlertPort.confirm`; el
   * servicio no decide, sólo ejecuta la cancelación confirmada.
   */
  ejecutar(input: CancelGhostStockInput): Promise<boolean> {
    return this.api.cancelGhostStock(input);
  }
}
