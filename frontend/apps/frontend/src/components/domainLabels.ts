import {
  FulfillmentStatus,
  InvoiceType,
  OrderStatus,
  ProductStatus,
  ProductType,
  ReturnStatus,
  UserRole,
  WarehouseType,
} from '../domain';

/**
 * Rotulación de los enums del dominio en español (Frontend-Design-System §3).
 *
 * Vive en `components/`, no en los módulos: según Frontend-Architecture §2 los
 * módulos no importan `domain/`, y ésta es la capa puente que traduce el
 * vocabulario del backend al de la Ley, igual que `errorMessage.ts`. No se
 * inventa ningún sinónimo: cada rótulo es el término exacto de `ZENTRIC.md`.
 *
 * Los mapas son `Record<Enum, …>` para que el compilador obligue a rotular
 * cualquier estado nuevo del backend: si se añade uno, esto no compila y ninguna
 * vista queda muda (§4).
 */

/**
 * Tonos de `StatusBadge` (`@zentric/ui`).
 *
 * Se repiten aquí y no se derivan del componente para no acoplar el rótulo a su
 * implementación; si divergen, el `tone=` de la insignia falla al compilar.
 */
export type TonoDeEstado = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

/** Roles de usuario. Origen: `ZENTRIC.md` §5 (tabla de roles). */
export const NOMBRES_DE_ROL: Record<UserRole, string> = {
  [UserRole.Buyer]: 'Comprador',
  [UserRole.Seller]: 'Vendedor',
  [UserRole.LogisticsOperator]: 'Operador Logístico',
  [UserRole.Administrator]: 'Administrador',
  [UserRole.Supervisor]: 'Supervisor',
};

/** Tono por rol de usuario (Frontend-Design-System §3). */
export const TONOS_DE_ROL: Record<UserRole, TonoDeEstado> = {
  [UserRole.Administrator]: 'danger',
  [UserRole.Seller]: 'info',
  [UserRole.Buyer]: 'success',
  [UserRole.LogisticsOperator]: 'warning',
  [UserRole.Supervisor]: 'neutral',
};

/** Estados de una devolución. Origen: `ZENTRIC.md` Dominio 10. */
export const NOMBRES_DE_ESTADO_DE_DEVOLUCION: Record<ReturnStatus, string> = {
  [ReturnStatus.Requested]: 'Solicitada',
  [ReturnStatus.Approved]: 'Aprobada',
  [ReturnStatus.Rejected]: 'Rechazada',
  [ReturnStatus.Refunded]: 'Reembolsada',
};

/**
 * Tono de la insignia por estado de devolución (Frontend-Design-System §3).
 *
 * `Aprobada` es `warning` a propósito: en la bandeja del Administrador es el
 * único estado que espera una acción suya —el reembolso, §2.2—, y el tono lo
 * señala sin depender del color (§5: el texto siempre acompaña).
 */
export const TONOS_DE_ESTADO_DE_DEVOLUCION: Record<ReturnStatus, TonoDeEstado> = {
  [ReturnStatus.Requested]: 'info',
  [ReturnStatus.Approved]: 'warning',
  [ReturnStatus.Rejected]: 'danger',
  [ReturnStatus.Refunded]: 'success',
};

/** Tipos de bodega. Origen: `ZENTRIC.md` Dominio 7. */
export const NOMBRES_DE_TIPO_DE_BODEGA: Record<WarehouseType, string> = {
  [WarehouseType.Marketplace]: 'Marketplace',
  [WarehouseType.Vendor]: 'Vendedor',
};

/** Tipos de factura (Q-18). Origen: `ZENTRIC.md` Dominio 9 / ADR-0023. */
export const NOMBRES_DE_TIPO_DE_FACTURA: Record<InvoiceType, string> = {
  [InvoiceType.Master]: 'Factura Maestra',
  [InvoiceType.ZentricDetail]: 'Detalle Zentric',
  [InvoiceType.VendorDetail]: 'Factura de Vendedor',
};

/**
 * Rótulos de negocio del comprobante para la Consola de Facturación.
 *
 * [ADDENDUM - DICTADO POR OWNER, 2026-10-18]: el Administrador opera en
 * lenguaje de negocio —qué recibe el comprador, qué retiene la plataforma,
 * qué se liquida al vendedor—, no en el vocabulario tributario interno
 * (`Factura Maestra` / `Detalle Zentric`). Los porcentajes 5%/95% son la
 * regla de split de `ZENTRIC.md` Dominio 9. El mapa canónico de arriba se
 * conserva para las vistas de auditoría.
 */
export const NOMBRES_DE_COMPROBANTE: Record<InvoiceType, string> = {
  [InvoiceType.Master]: 'Factura Comprador',
  [InvoiceType.ZentricDetail]: 'Comisión Plataforma (5%)',
  [InvoiceType.VendorDetail]: 'Liquidación Vendedor (95%)',
};

/**
 * Tono de la insignia por tipo de comprobante.
 *
 * Sigue la matriz canónica de Frontend-Design-System §6: el comprobante del
 * comprador es el documento confirmado (`success`), la comisión de la
 * plataforma es informativa (`info`) y la liquidación del vendedor es
 * registro (`neutral`).
 */
export const TONOS_DE_COMPROBANTE: Record<InvoiceType, TonoDeEstado> = {
  [InvoiceType.Master]: 'success',
  [InvoiceType.ZentricDetail]: 'info',
  [InvoiceType.VendorDetail]: 'neutral',
};

/** Estados de un pedido de compra. Origen: `ZENTRIC.md` Dominio 6 / OrderStatus.cs */
export const NOMBRES_DE_ESTADO_DE_PEDIDO: Record<OrderStatus, string> = {
  [OrderStatus.Cart]: 'Carrito',
  [OrderStatus.PendingPayment]: 'Pendiente de Pago',
  [OrderStatus.Paid]: 'Pagado',
  [OrderStatus.Dispatched]: 'Despachado',
  [OrderStatus.Delivered]: 'Entregado',
  [OrderStatus.Cancelled]: 'Cancelado',
};

/** Tono por estado de pedido (Frontend-Design-System §3). */
export const TONOS_DE_ESTADO_DE_PEDIDO: Record<OrderStatus, TonoDeEstado> = {
  [OrderStatus.Cart]: 'neutral',
  [OrderStatus.PendingPayment]: 'warning',
  [OrderStatus.Paid]: 'info',
  [OrderStatus.Dispatched]: 'info',
  [OrderStatus.Delivered]: 'success',
  [OrderStatus.Cancelled]: 'danger',
};

/** Estados de una orden de despacho (Fulfillment). Origen: `ZENTRIC.md` Dominio 8 / FulfillmentStatus.cs */
export const NOMBRES_DE_ESTADO_DE_DESPACHO: Record<FulfillmentStatus, string> = {
  [FulfillmentStatus.PendingPack]: 'Pendiente de Empaque',
  [FulfillmentStatus.Packed]: 'Empacado',
  [FulfillmentStatus.Dispatched]: 'Despachado',
  [FulfillmentStatus.Delivered]: 'Entregado',
  [FulfillmentStatus.Cancelled]: 'Cancelado',
};

/** Tono por estado de despacho (Frontend-Design-System §3). */
export const TONOS_DE_ESTADO_DE_DESPACHO: Record<FulfillmentStatus, TonoDeEstado> = {
  [FulfillmentStatus.PendingPack]: 'warning',
  [FulfillmentStatus.Packed]: 'info',
  [FulfillmentStatus.Dispatched]: 'info',
  [FulfillmentStatus.Delivered]: 'success',
  [FulfillmentStatus.Cancelled]: 'danger',
};

/** Estados de publicación de un producto. Origen: `ZENTRIC.md` Dominio 5. */
export const NOMBRES_DE_ESTADO_DE_PRODUCTO: Record<ProductStatus, string> = {
  [ProductStatus.Published]: 'Publicado',
  [ProductStatus.Suspended]: 'Suspendido',
  [ProductStatus.Discontinued]: 'Descontinuado',
};

/**
 * Tono por estado de producto (Frontend-Design-System §3). En la vista del
 * Vendedor lo que exige acción es lo que está FUERA del catálogo: el
 * `Suspendido`, que sólo se reactiva publicándolo.
 */
export const TONOS_DE_ESTADO_DE_PRODUCTO: Record<ProductStatus, TonoDeEstado> = {
  [ProductStatus.Published]: 'success',
  [ProductStatus.Suspended]: 'warning',
  [ProductStatus.Discontinued]: 'neutral',
};

/** Tipos de producto. Origen: `ZENTRIC.md` Dominio 5 ("Físico o Digital"). */
export const NOMBRES_DE_TIPO_DE_PRODUCTO: Record<ProductType, string> = {
  [ProductType.Physical]: 'Físico',
  [ProductType.Digital]: 'Digital',
};

/** Opción de un `Select`: el valor que viaja al backend y su rótulo. */
export interface OpcionDeDominio<Valor extends string> {
  valor: Valor;
  etiqueta: string;
}

/**
 * Deriva las opciones de un `Select` del mapa de nombres.
 *
 * Se construye desde el propio `Record` para que no existan dos fuentes del
 * mismo vocabulario, y conserva el orden de declaración (el de la Ley).
 */
export function opcionesDesde<Valor extends string>(
  nombres: Record<Valor, string>,
): readonly OpcionDeDominio<Valor>[] {
  return (Object.keys(nombres) as Valor[]).map((valor) => ({
    valor,
    etiqueta: nombres[valor],
  }));
}
