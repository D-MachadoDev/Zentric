import type { AddCartItemInput, Order, OrderListItem, ZentricApiPort } from '../../domain';

/** Casos de uso de carrito y pedidos (Frontend-Domain-Services §2.4). */

export class AbrirCarritoService {
  constructor(private readonly api: ZentricApiPort) {}

  /** `POST /api/orders/cart`. Sin cuerpo: el carrito es del comprador del token. */
  ejecutar(): Promise<string> {
    return this.api.createCart();
  }
}

export class AgregarAlCarritoService {
  constructor(private readonly api: ZentricApiPort) {}

  /** `POST /api/orders/cart/items`. Añade una línea con su `variantId`. */
  ejecutar(input: AddCartItemInput): Promise<void> {
    return this.api.addCartItem(input);
  }
}

export class ConsultarPedidoService {
  constructor(private readonly api: ZentricApiPort) {}

  /** Detalle con líneas y total. */
  ejecutar(id: string): Promise<Order> {
    return this.api.getOrder(id);
  }
}

export class ListarPedidosService {
  constructor(private readonly api: ZentricApiPort) {}

  /** Listado de pedidos visibles para el llamante (ADR-0017). */
  ejecutar(status?: string): Promise<OrderListItem[]> {
    return this.api.listOrders(status);
  }
}

export class RealizarCheckoutService {
  constructor(private readonly api: ZentricApiPort) {}

  /**
   * `POST /api/orders/{id}/checkout`: `Cart` → `PendingPayment` y reserva el
   * stock. El servidor responde `200 OK` **sin cuerpo**, así que el caso de uso
   * no devuelve estado: la UI lo relee con `ConsultarPedidoService` si lo necesita.
   */
  ejecutar(orderId: string): Promise<void> {
    return this.api.checkoutOrder(orderId);
  }
}

export class PagarPedidoService {
  constructor(private readonly api: ZentricApiPort) {}

  /**
   * `POST /api/orders/{id}/pay`: `PendingPayment` → `Paid`. **No cobra**: el
   * backend no tiene pasarela de pago (ADR-0009). Responde `200 OK` sin cuerpo.
   */
  ejecutar(orderId: string): Promise<void> {
    return this.api.payOrder(orderId);
  }
}
