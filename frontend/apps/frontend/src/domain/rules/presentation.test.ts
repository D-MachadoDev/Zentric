import { describe, expect, it } from 'vitest';
import { OrderStatus, ProductType } from '../enums';
import { admiteDevolucion, esPedidoModificable } from './presentation';

describe('esPedidoModificable (ciclo de vida del pedido)', () => {
  it('admite edición mientras el pedido sigue en carrito o pendiente de pago', () => {
    expect(esPedidoModificable(OrderStatus.Cart)).toBe(true);
    expect(esPedidoModificable(OrderStatus.PendingPayment)).toBe(true);
  });

  it('un pedido pagado o posterior es de sólo lectura', () => {
    expect(esPedidoModificable(OrderStatus.Paid)).toBe(false);
    expect(esPedidoModificable(OrderStatus.Dispatched)).toBe(false);
    expect(esPedidoModificable(OrderStatus.Delivered)).toBe(false);
    expect(esPedidoModificable(OrderStatus.Cancelled)).toBe(false);
  });
});

describe('admiteDevolucion (ADDENDUM Dominio 10)', () => {
  it('lo físico se devuelve y lo digital no', () => {
    expect(admiteDevolucion(ProductType.Physical)).toBe(true);
    expect(admiteDevolucion(ProductType.Digital)).toBe(false);
  });
});
