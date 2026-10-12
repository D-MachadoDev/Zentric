import type {
  InspectReturnInput,
  RequestReturnInput,
  ReturnRequest,
  ZentricApiPort,
} from '../../domain';

/**
 * Casos de uso de devoluciones (Frontend-Domain-Services §2.7).
 *
 * Los productos digitales no se pueden devolver (ADDENDUM Dominio 10); esa
 * restricción la decide la interfaz con `admiteDevolucion` antes de llegar aquí.
 */

export class SolicitarDevolucionService {
  constructor(private readonly api: ZentricApiPort) {}

  /** `POST /api/returns/request`. */
  ejecutar(input: RequestReturnInput): Promise<string> {
    return this.api.requestReturn(input);
  }
}

export class InspeccionarDevolucionService {
  constructor(private readonly api: ZentricApiPort) {}

  /** `POST /api/returns/{id}/inspect`. Dictamen del Operador logístico (ADR-0018). */
  ejecutar(id: string, input: InspectReturnInput): Promise<void> {
    return this.api.inspectReturn(id, input);
  }
}

export class AprobarDevolucionService {
  constructor(private readonly api: ZentricApiPort) {}

  /**
   * `POST /api/returns/{id}/approve`. Aprobación del Vendedor y repone stock.
   *
   * **Sólo el Vendedor** (política `ReturnApprove`, ADR-0006): la UI no ofrece
   * esta acción a ningún otro rol, porque el servidor la rechaza con `403`.
   */
  ejecutar(returnRequestId: string): Promise<void> {
    return this.api.approveReturn(returnRequestId);
  }
}

export class ConsultarDevolucionesService {
  constructor(private readonly api: ZentricApiPort) {}

  /**
   * `GET /api/returns`. Bandeja visible para el rol llamante: el reparto por rol
   * (Comprador por pedido, Vendedor por variante, el resto sin filtro) lo hace el
   * servidor, no el cliente. Status es filtro opcional (ADR-0012).
   */
  ejecutar(status?: string): Promise<ReturnRequest[]> {
    return status !== undefined ? this.api.listReturns(status) : this.api.listReturns();
  }
}

export class ObtenerDevolucionService {
  constructor(private readonly api: ZentricApiPort) {}

  /** `GET /api/returns/{id}`. Consulta detalle y dictamen de inspección. */
  ejecutar(id: string): Promise<ReturnRequest> {
    return this.api.getReturn(id);
  }
}

export class ReembolsarDevolucionService {
  constructor(private readonly api: ZentricApiPort) {}

  /**
   * `POST /api/returns/{id}/refund` (Q-24). **Sólo Administrador** y sólo sobre
   * una devolución ya aprobada: mueve dinero, así que la UI exige confirmación
   * previa (Frontend-Adapters §5).
   */
  ejecutar(id: string): Promise<void> {
    return this.api.refundReturn(id);
  }
}
