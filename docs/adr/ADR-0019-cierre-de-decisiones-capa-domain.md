# ADR-0019 — Cierre de decisiones de la capa Domain

- **Estado:** Aceptado
- **Fecha:** 2026-10-03
- **Dictado por:** Owner (grill de cierre de la capa Domain)

## Contexto
La auditoría de la especificación de Dominio contra el código dejó ocho reglas y estados que el documento
describía pero el código no cumplía, o que eran **inventos nuestros** sin respaldo en la Ley. La Ley
(`ZENTRIC.md`) es intocable: cada decisión de aquí la respeta y, cuando la Ley ya lo decía, la aplica.

## Decisiones

1. **Ciclo del pedido maestro** (PED-05): el pedido refleja el **mínimo común** de sus despachos — `Dispatched` cuando todos lo están, `Delivered` cuando todos están entregados. *(Ley: Dominio 7, «Despachado: salida física de la bodega» / «Entregado / Finalizado».)*
2. **Precio congelado** (PED-04): el checkout reescribe el precio de la línea con el del catálogo y lo **congela**. *(Ley: Dominio 7, el checkout «congela precio».)* Antes lo mandaba el cliente sin corregirlo. **Precisión de [ADR-0020](ADR-0020-precio-congelado-y-credito-parcial-por-linea.md) (2026-10-04):** el precio lo pone el servidor tomándolo de `Product.Price`, se congela al **añadir la línea al carrito** (no en el checkout) y el contrato de alta de línea ya no admite precio ni vendedor.
3. **Entrega digital** (CAT-02): el pago aprobado marca el digital como **entregado** y deja constancia con fecha. *(Ley: Dominio 5 y CAT-02, «entrega inmediata tras pago».)*
4. **Retracto temprano** (EXC-03): se resuelve por el flujo que ya existe (anular el despacho → devolución → reembolso del Administrador). **Sin estado nuevo en el pedido.** *(Ley: el ciclo solo añade «Anulado» por vencimiento del pago; RG-11 impide tocar un pedido finalizado.)*
5. **Ajuste de stock** (INV-04): solo el **Administrador** ajusta, siempre con motivo escrito. *(Ley: Dominio 6 lista el movimiento «Ajuste»; el Vendedor ya tiene «Ingreso».)*
6. **Bloqueo en cascada** (INV-05): bloquear al vendedor **suspende sus productos** y el checkout rechaza carritos con producto suspendido; lo ya pagado no se toca. *(Ley: Dominio 5 define el estado `Suspendido`; la Ley no encadena estados, esta regla solo conecta los que ya existen.)* **> [ENMIENDA — DICTADA POR OWNER 2026-10-04, ver [sección Enmiendas](#enmiendas):]** la cascada **se retiró**. Bloquear ya no toca el catálogo: los productos del Vendedor siguen `Published` y quien impide la venta es la política de autorización en el checkout. Manda INV-05 tal como quedó el 2026-10-04.
7. **Evento `CartExpiredDomainEvent`**: se **emite de verdad** al vencer el carrito (`OrderId` + fecha de expiración), para que las notificaciones futures lo escuchen.
8. **Factura maestra anulada** (FAC-02): `Anulled` solo cuando el Administrador marca el comprobante como rechazado o timed-out, y el motivo queda en el comprobante. *(Ley: Dominio 9, «validación de transacciones».)*

## Alternativas descartadas
- Mover el pedido maestro con el **primer** despacho: haría que un pedido con un paquete pendiente se viera «Entregado».
- **Estado nuevo** «Anulado por Vendedor»: contradice el ciclo de la Ley y RG-11.
- **Cascada total** (bloquear vendedor cancela pedidos y carritos): rompe pedidos ya pagados.
- **Borrar** el evento huérfano y el estado `Anulled`: se pierde la costura con módulos futuros y la constancia de una caída real.

## Consecuencias de código (pendientes de implementar)

`CustomerOrder.Dispatch/Deliver` con recálculo por despachos · precio de línea reescrito en el checkout ·
registro de entrega digital · `CancelDueToNoStock` con motivo «Retracto Temprano» · comando de ajuste de
stock (Admin + motivo) · ~~comando `SuspendProduct` + verificación de producto suspendido en el checkout~~
**(retirado por la enmienda del 2026-10-04: ahora es comando de bloqueo de Vendedor + rechazo en el
checkout)** · `CartExpiredDomainEvent` emitido por `CheckoutTimeoutService` (payload con fecha) ·
comando de anulación de factura maestra.

## Enmiendas

| Fecha | Decisión enmendada | Qué cambió | Quién |
|---|---|---|---|
| **2026-10-04** | **6 (bloqueo en cascada)** | **Retirada la cascada.** Bloquear a un Vendedor **no** suspende sus productos: siguen `Published` y el que impide su venta es la política de autorización, verificada en el checkout. `User` no emite eventos y `Product.Suspend()` deja de formar parte de INV-05. Lo ya pagado sigue sin tocarse (RG-11). Sustituye el texto original de este ADR. | Owner · registro en INV-05 |

## Trazabilidad
`06-business-rules.md` (PED-04, PED-05, CAT-02, INV-04, INV-05, EXC-03, FAC-02) ·
`07-lifecycle.md` · `04-domain-events.md` ·
`services/checkout-timeout-service.md` ·
[ADR-0018](ADR-0018-devoluciones-confianza-recepcion-responsabilidad.md)
