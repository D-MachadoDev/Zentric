# Servicio de Dominio: ReturnsApprovalService

## 1. Propósito y Responsabilidad
Garantizar la regla de negocio crítica que exige **doble aprobación** (Operador Logístico + Vendedor) antes de concretar la devolución de un producto físico, evitando fraudes y descuadres de stock.

## 2. Bounded Context
Opera en el **Returns Context**; el efecto sobre el stock ocurre en **Inventory** a través del evento de aprobación.

## 3. Entradas y Salidas
- **Inputs:** un `ReturnRequest` y un booleano `isSameWarehouseAndVendor` que el **servidor** deduce (el cliente ya no lo envía: es `true` solo si la recepción es en una bodega del propio vendedor).
- **Output:** `void` — delega en `ReturnRequest.ApproveByVendor(...)`, que cambia el estado o lanza `InvalidOperationException`.

## 4. Flujo Lógico y Reglas ([DEV-01](../06-business-rules.md))
1. El proceso arranca formalmente cuando el operador logístico de Zentric recibe el paquete de vuelta en sus instalaciones o centro de acopio.
2. **Paso 1 (Logística):** El `LogisticsOperator` inspecciona físicamente el producto y registra en el sistema su veredicto (Aprobado / Rechazado por daño por mal uso).
3. Si Logística aprueba, el estado avanza y se notifica al **Vendedor**.
4. **Paso 2 (Vendedor):** El **Vendedor** revisa el reporte logístico (o el producto si fue enviado a su propia bodega) y emite su aprobación para aceptar el reingreso al inventario.
5. **Completitud:** `ApproveByVendor` exige inspección en buen estado **salvo** que el retorno sea a la misma bodega y el mismo vendedor (`isSameWarehouseAndVendor`). Al aprobar: `ReturnApprovedEvent` → `ReturnApprovedEventHandler` → `Inventory.ReturnToUsedStock`. El reembolso lo ejecuta aparte el Administrador (`RefundReturnCommand`).

## 5. Eventos Emitidos
- `ReturnApprovedEvent`: al aprobar la devolución. El handler (`ReturnApprovedEventHandler`) reingresa la mercancía como **stock usado**; el reembolso lo ejecuta aparte el Administrador (`RefundReturnCommand`).
- Rechazos: `Reject()` cambia el estado a `Rejected` sin emitir eventos — **no existe** `ReturnRejectedDomainEvent` ni notificación al cliente.

## 6. Confianza, recepción y dinero (ADR-0018, 2026-10-03)

- **Inspección siempre del Operador Logístico de Zentric**, nunca personal del vendedor. Si la mercancía vuelve a la bodega del vendedor, el Operador inspecciona allá; si vuelve a un hub, inspecciona en el hub.
- **Lugar de recepción modelado:** bodega del Vendedor o bodega del Marketplace. `POST /returns/request` valida en el servidor que el `WarehouseId` exista y sea una de esas dos; cualquier otro GUID es rechazado.
- **`isSameWarehouseAndVendor` lo deduce el servidor:** es `true` solo si la devolución se recibe en una bodega **del propio vendedor** (`Type == Vendor && VendorId == producto.VendorId`); un hub del Marketplace no habilita la exención. Ya no viaja en el body de `POST /returns/{id}/approve` (ADR-0018).
- **Responsabilidad económica — decisión permanente, no carencia:** Zentric ejecuta el reembolso al comprador. El **Vendedor es el responsable económico por defecto** y **Zentric solo absorbe** cuando una regla de plataforma lo establece. **No existe cargo ni liquidación entre Zentric y los vendedores, y no se va a construir.** *(Decisión del Owner 2026-10-04, criterio R-20: no se inventan mecanismos que la Ley no describe.)* Es una decisión de no-construir, no un hueco pendiente: el modelo asume que la relación económica con el vendedor se resuelve fuera de la plataforma.
