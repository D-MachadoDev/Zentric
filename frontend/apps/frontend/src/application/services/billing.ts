import type { Invoice, ZentricApiPort } from '../../domain';

/** Casos de uso de facturación (Frontend-Domain-Services §2.5, Q-18 split). */

export class EmitirFacturasService {
  constructor(private readonly api: ZentricApiPort) {}

  /** `POST /api/billing/orders/{id}/invoices`: Factura Maestra + Detalle Zentric. */
  ejecutar(orderId: string): Promise<boolean> {
    return this.api.generateInvoices(orderId);
  }
}

export class ConsultarFacturasService {
  constructor(private readonly api: ZentricApiPort) {}

  /** `GET /api/billing/orders/{id}/invoices`. */
  ejecutar(orderId: string): Promise<Invoice[]> {
    return this.api.getInvoicesByOrder(orderId);
  }
}
