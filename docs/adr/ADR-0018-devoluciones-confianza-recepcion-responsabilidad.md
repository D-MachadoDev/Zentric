# ADR-0018 — Devoluciones: inspección, lugar de recepción y responsabilidad económica

- **Estado:** Aceptado
- **Fecha:** 2026-10-03
- **Dictado por:** Owner (grill de la auditoría spec-vs-código)

## Contexto

El flujo de devoluciones operaba sin base para verificar dos cosas: **quién puede dar por buena una devolución** y **a quién se le atribuye el crédito**. El propio contrato HTTP pedía al cliente el flag `isSameWarehouseAndVendor` (el cliente decide si se salta la inspección) y el `WarehouseId` donde se recibe la mercancía, sin validación. No había regla económica: el reembolso es un crédito interno al comprador y no existe ningún mecanismo de cobro ni pago entre Zentric y los vendedores (ni liquidación de comisiones, que solo se facturan).

## Decisión

1. **Inspección siempre del Operador Logístico de Zentric.** Quien inspecciona el bien devuelto es el Operador de Zentric, nunca personal del vendedor. Si la mercancía vuelve a la bodega del vendedor, el Operador inspecciona allá.
2. **El lugar de recepción se modela:** bodega del Vendedor o bodega del Marketplace/hub. El cliente no elige un `WarehouseId` arbitrario: el servidor valida que sea una bodega legítima de recepción.
3. **El flag `isSameWarehouseAndVendor` lo deduce el servidor**, comparando el lugar de recepción con la bodega del `Shipment` del `FulfillmentOrder` y el `VendorId` de la línea del pedido. Desaparece del contrato HTTP.
4. **Responsabilidad económica del reembolso:** Zentric lo ejecuta al comprador (el Administrador lo emite). El **Vendedor es el responsable económico por defecto**; **Zentric solo absorbe el costo cuando una regla de plataforma lo establece** (por definir, p. ej. según el lugar de recepción). El crédito a favor del comprador queda intacto en ambos casos.
5. **Mecanismo de cargo/liquidación al vendedor:** no existe. Queda registrado como pendiente, no implementado en esta ronda.

## Alternativas descartadas

- **Inspección por el Vendedor en su propia bodega:** el vendedor calificaría su propia mercancía; se pierde la doble verificación.
- **`isSameWarehouseAndVendor` como dato del cliente:** cualquiera con permiso de aprobación podría saltarse la inspección declarando "misma bodega y mismo vendedor".

## Consecuencias de código (implementado 2026-10-03)

- `ApproveReturnCommand` ya **no** lleva `isSameWarehouseAndVendor`: el handler lo deduce comparando el `WarehouseId` de recepción con el **dueño de la bodega** (`Type == Vendor && VendorId == producto.VendorId`). Un hub del Marketplace **no** habilita la exención: allí no está el vendedor. bodies, E2E y smoke actualizados.
  > **Desvío del mecanismo que decía la decisión 3** (anotar como tal, pendiente de convalidación del Owner): el texto original comparaba con la bodega del `Shipment` del `FulfillmentOrder`. Se implementó por **propiedad de la bodega** porque `FulfillmentOrder` solo registra guías cuando se crea por `POST /api/logistics/fulfillment` y el checkout **no** las crea: con el mecanismo original el flag nunca habría sido verdadero en el flujo real y la exención quedaría muerta.
- `RequestReturnCommand` ya **no** lleva `ProductType` (el cliente no puede "declarar físico" un digital para esquivar la prohibición de la Ley) ni el `WarehouseId` sin validar: el handler exige que la bodega exista y sea **del Marketplace o del propio vendedor** del producto.
- `RequestReturnCommandValidator` pierde la regla de `ProductType` (ese dato ya no viene del cuerpo).
- Pruebas: `ApproveReturnCommandHandlerTests` (exención solo en bodega propia del vendedor; sin inspección en hub falla), `RequestReturnCommandHandlerTests` (digital rechazado, bodega ajena rechazada, hub aceptado), E2E de devoluciones y `authorization-smoke.ps1` sin el flag.
- **Pendiente** (no depende del flag): la exención no comprueba que la mercancía **volvió** a esa bodega; solo que se recibe en una bodega del vendedor.

## Trazabilidad

DEV-01 y EXC-02 en `06-business-rules.md`; flujos en `services/returns-approval-service.md`; endpoints en `01-endpoints.md`.
