# Servicio de Dominio: ReturnsApprovalService

## 1. Propósito y Responsabilidad
Garantizar la regla de negocio crítica que exige **doble aprobación** (Operador Logístico + Vendedor) antes de concretar la devolución de un producto físico, evitando fraudes y descuadres de stock.

## 2. Bounded Context
Opera principalmente en el **Fulfillment Context** y altera el **Inventory Context**.

## 3. Entradas y Salidas
- **Inputs:** Confirmación de estado de Logística (`LogisticsApproval`), Confirmación comercial del Vendedor (`SellerApproval`).
- **Output:** `Result` (Éxito de la devolución o rechazo).

## 4. Flujo Lógico y Reglas ([DEV-01](../06-business-rules.md))
1. El proceso arranca formalmente cuando el operador logístico de Zentric recibe el paquete de vuelta en sus instalaciones o centro de acopio.
2. **Paso 1 (Logística):** El `LogisticsOperator` inspecciona físicamente el producto y registra en el sistema su veredicto (Aprobado / Rechazado por daño por mal uso).
3. Si Logística aprueba, el estado avanza y se notifica al `Seller`.
4. **Paso 2 (Vendedor):** El `Seller` revisa el reporte logístico (o el producto si fue enviado a su propia bodega) y emite su aprobación para aceptar el reingreso al inventario.
5. **Completitud:** Solo cuando ambas banderas (Logistics = True, Seller = True) están presentes:
   - El servicio invoca `InventoryItem.Adjust(qty)` para retornar la unidad al stock disponible.
   - El servicio emite el evento de finalización.

## 5. Eventos Emitidos
- `ReturnApprovedDomainEvent`: Si el proceso es exitoso. Detona el reembolso al cliente en el módulo de facturación.
- `ReturnRejectedDomainEvent`: Si cualquiera de los dos roles rechaza la devolución. Detona notificación al cliente.
