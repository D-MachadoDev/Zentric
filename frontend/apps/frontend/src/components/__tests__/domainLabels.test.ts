import { describe, expect, it } from 'vitest';
import {
  FulfillmentStatus,
  InvoiceType,
  OrderStatus,
  ProductStatus,
  ProductType,
  ReturnStatus,
  UserRole,
  WarehouseType,
} from '../../domain';
import {
  NOMBRES_DE_COMPROBANTE,
  NOMBRES_DE_ESTADO_DE_DESPACHO,
  NOMBRES_DE_ESTADO_DE_DEVOLUCION,
  NOMBRES_DE_ESTADO_DE_PEDIDO,
  NOMBRES_DE_ESTADO_DE_PRODUCTO,
  NOMBRES_DE_ROL,
  NOMBRES_DE_TIPO_DE_BODEGA,
  NOMBRES_DE_TIPO_DE_FACTURA,
  NOMBRES_DE_TIPO_DE_PRODUCTO,
  TONOS_DE_COMPROBANTE,
  TONOS_DE_ESTADO_DE_DESPACHO,
  TONOS_DE_ESTADO_DE_DEVOLUCION,
  TONOS_DE_ESTADO_DE_PEDIDO,
  TONOS_DE_ESTADO_DE_PRODUCTO,
  TONOS_DE_ROL,
  opcionesDesde,
} from '../domainLabels';

/**
 * Rotulación de enums (Frontend-Design-System §3).
 *
 * Lo que se fija aquí no es la ortografía de cada rótulo, sino que el
 * vocabulario cubra TODOS los estados del backend sin inventar ninguno: si el
 * backend añade un rol o un estado, esta prueba falla antes de que una pantalla
 * lo muestre en crudo.
 */
describe('domainLabels (§3)', () => {
  it('rotula los cinco roles con los términos de la Ley', () => {
    expect(Object.values(UserRole).map((rol) => NOMBRES_DE_ROL[rol])).toEqual([
      'Comprador',
      'Vendedor',
      'Administrador',
      'Supervisor',
      'Operador Logístico',
    ]);
    expect(TONOS_DE_ROL[UserRole.Administrator]).toBe('danger');
    expect(TONOS_DE_ROL[UserRole.Buyer]).toBe('success');
  });

  it('rotula los cuatro estados de devolución con los de la Ley (Dominio 10)', () => {
    expect(NOMBRES_DE_ESTADO_DE_DEVOLUCION).toEqual({
      [ReturnStatus.Requested]: 'Solicitada',
      [ReturnStatus.Approved]: 'Aprobada',
      [ReturnStatus.Rejected]: 'Rechazada',
      [ReturnStatus.Refunded]: 'Reembolsada',
    });
  });

  it('señala Aprobada con warning: es el único estado que espera al Administrador', () => {
    // §2.2: el reembolso sólo cabe sobre una devolución Aprobada.
    expect(TONOS_DE_ESTADO_DE_DEVOLUCION[ReturnStatus.Approved]).toBe('warning');
    expect(TONOS_DE_ESTADO_DE_DEVOLUCION[ReturnStatus.Refunded]).toBe('success');
  });

  it('rotula los tipos de bodega y de factura', () => {
    expect(NOMBRES_DE_TIPO_DE_BODEGA[WarehouseType.Marketplace]).toBe('Marketplace');
    expect(NOMBRES_DE_TIPO_DE_BODEGA[WarehouseType.Vendor]).toBe('Vendedor');
    expect(NOMBRES_DE_TIPO_DE_FACTURA[InvoiceType.Master]).toBe('Factura Maestra');
    expect(NOMBRES_DE_TIPO_DE_FACTURA[InvoiceType.VendorDetail]).toBe('Factura de Vendedor');
  });

  it('rotula los comprobantes en lenguaje de negocio para la Consola de Facturación [ADDENDUM Owner 2026-10-18]', () => {
    expect(NOMBRES_DE_COMPROBANTE).toEqual({
      [InvoiceType.Master]: 'Factura Comprador',
      [InvoiceType.ZentricDetail]: 'Comisión Plataforma (5%)',
      [InvoiceType.VendorDetail]: 'Liquidación Vendedor (95%)',
    });
    expect(TONOS_DE_COMPROBANTE).toEqual({
      [InvoiceType.Master]: 'success',
      [InvoiceType.ZentricDetail]: 'info',
      [InvoiceType.VendorDetail]: 'neutral',
    });
    // El mapa canónico NOMBRES_DE_TIPO_DE_FACTURA se conserva para vistas de auditoría/supervisor
    expect(NOMBRES_DE_TIPO_DE_FACTURA[InvoiceType.Master]).toBe('Factura Maestra');
    expect(NOMBRES_DE_TIPO_DE_FACTURA[InvoiceType.ZentricDetail]).toBe('Detalle Zentric');
    expect(NOMBRES_DE_TIPO_DE_FACTURA[InvoiceType.VendorDetail]).toBe('Factura de Vendedor');
  });

  it('rotula los estados de pedido con los términos de la Ley (Dominio 6)', () => {
    expect(NOMBRES_DE_ESTADO_DE_PEDIDO).toEqual({
      [OrderStatus.Cart]: 'Carrito',
      [OrderStatus.PendingPayment]: 'Pendiente de Pago',
      [OrderStatus.Paid]: 'Pagado',
      [OrderStatus.Dispatched]: 'Despachado',
      [OrderStatus.Delivered]: 'Entregado',
      [OrderStatus.Cancelled]: 'Cancelado',
    });
    expect(TONOS_DE_ESTADO_DE_PEDIDO[OrderStatus.PendingPayment]).toBe('warning');
    expect(TONOS_DE_ESTADO_DE_PEDIDO[OrderStatus.Delivered]).toBe('success');
  });

  it('rotula el estado y el tipo de producto con los términos de la Ley (Dominio 5)', () => {
    expect(NOMBRES_DE_ESTADO_DE_PRODUCTO).toEqual({
      [ProductStatus.Published]: 'Publicado',
      [ProductStatus.Suspended]: 'Suspendido',
      [ProductStatus.Discontinued]: 'Descontinuado',
    });
    expect(NOMBRES_DE_TIPO_DE_PRODUCTO[ProductType.Physical]).toBe('Físico');
    expect(NOMBRES_DE_TIPO_DE_PRODUCTO[ProductType.Digital]).toBe('Digital');
  });

  it('señala Suspendo con warning: es el estado que el Vendedor puede reactivar', () => {
    expect(TONOS_DE_ESTADO_DE_PRODUCTO[ProductStatus.Suspended]).toBe('warning');
    expect(TONOS_DE_ESTADO_DE_PRODUCTO[ProductStatus.Published]).toBe('success');
  });

  it('rotula los estados de despacho con los términos de la Ley (Dominio 8)', () => {
    expect(NOMBRES_DE_ESTADO_DE_DESPACHO).toEqual({
      [FulfillmentStatus.PendingPack]: 'Pendiente de Empaque',
      [FulfillmentStatus.Packed]: 'Empacado',
      [FulfillmentStatus.Dispatched]: 'Despachado',
      [FulfillmentStatus.Delivered]: 'Entregado',
      [FulfillmentStatus.Cancelled]: 'Cancelado',
    });
    expect(TONOS_DE_ESTADO_DE_DESPACHO[FulfillmentStatus.PendingPack]).toBe('warning');
    expect(TONOS_DE_ESTADO_DE_DESPACHO[FulfillmentStatus.Delivered]).toBe('success');
    expect(TONOS_DE_ESTADO_DE_DESPACHO[FulfillmentStatus.Cancelled]).toBe('danger');
  });

  it('deriva una opción por cada valor del enum, sin perder ninguno', () => {
    const opciones = opcionesDesde(NOMBRES_DE_ROL);

    expect(opciones).toHaveLength(Object.values(UserRole).length);
    expect(opciones.map((opcion) => opcion.valor).sort()).toEqual(
      Object.values(UserRole).sort(),
    );
  });
});
