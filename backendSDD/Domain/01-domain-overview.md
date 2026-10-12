# 01. Domain Overview (Visión General)

> **Documento consolidado (2026-09-27).** La visión general de módulos y el
> patrón arquitectónico que aquí se describían se incorporaron a
> [`01-models.md`](01-models.md) (visión del dominio) y a
> [`../02-software-architecture.md`](../02-software-architecture.md) (patrón
> arquitectónico). Este archivo queda como **índice de navegación** del
> subárbol `Domain/`, sin duplicar contenido.
>
> Motivo de la consolidación: `01-domain-overview.md` y `01-models.md` se
> solapaban, lo que obligaba a mantener la misma verdad en dos lugares.

## Índice del dominio

| Documento | Contenido | Verificado contra el código | Decisión |
|---|---|---|---|
| [`01-models.md`](01-models.md) | Aggregate Roots y entidades por Bounded Context, con métodos verificados contra el código | Sí | — |
| [`02-aggregates-and-entities.md`](02-aggregates-and-entities.md) | Responsabilidades y límites transaccionales de cada agregado | Sí | — |
| [`02-value-objects.md`](02-value-objects.md) | Value Objects, enumeraciones y la política de moneda por defecto | Sí | — |
| [`03-domain-services.md`](03-domain-services.md) | Servicios de dominio | Sí | — |
| [`04-domain-events.md`](04-domain-events.md) | Eventos de dominio | Sí | — |
| [`04-invariants-and-rules.md`](04-invariants-and-rules.md) | Invariantes estrictas | Sí | — |
| [`05-ports.md`](05-ports.md) | Puertos de salida del dominio | Sí | — |
| [`06-business-rules.md`](06-business-rules.md) | Reglas de negocio transversales | Sí | — |
| [`07-lifecycle.md`](07-lifecycle.md) | Ciclo de vida de las entidades | Sí | — |
| [`services/`](services/) | Servicios de dominio con semántica particular | Parcial | — |

**Qué significan las dos columnas:**

- **Verificado contra el código** — si cada elemento que el documento nombra existe en el código con esa firma exacta. `Parcial` significa que el documento describe algo que hoy no está construido; esos casos llevan su marca `[NO IMPLEMENTADO]` con fecha y motivo.
- **Decisión** — de dónde sale la regla: un ADR, un dictamen del Owner fechado, o nada. Una regla sin decisión es una descripción, no una regla.

**Objetivo de la capa:** que todo el `Domain/` sea **replicable**. La prueba se ejecuta sobre una copia aislada de la carpeta —sin código, sin ADR y sin `orchestrator-state.md`— y exige que un agente sin contexto responda sin inventar: el precio de una línea y el contrato que la crea · la devolución de un producto digital · las invariantes no implementadas y si tienen decisión · la emisión y agrupación de facturas · el ciclo de vida de `CustomerOrder`. Si en algún punto esa prueba se suspende o responde «no documentado», la carpeta no está lista por mucho que el resto cuadre.

## Módulos del dominio (resumen)

| Módulo | Responsabilidad | Conceptos clave | Reglas que lo gobiernan |
|---|---|---|---|
| Identity | Usuarios y estado comercial de los participantes | Unicidad de documento, un solo rol por usuario, bloqueos | INV-05 ✅, inv. 16 |
| Catalog | Oferta de vendedores hacia compradores | Producto y variantes (SKU), publicación automática (CAT-01), físico vs digital | CAT-01, CAT-02, CAT-03 |
| Inventory | Dónde están las cosas físicas y cuántas hay | Control por Variante y Bodega, bodegas Marketplace vs Vendor | INV-01, INV-02, INV-03, INV-04 |
| Ordering | Intención de compra convertida en contrato | Carrito vs pedido formal, reserva con *timeout*, factura centralizada | PED-01, PED-02, PED-03, PED-04, PED-05 |
| Fulfillment | Pedido maestro traducido a órdenes de trabajo por vendedor | Fragmentación por vendedor (en el checkout), quiebres de stock | EXC-01, EXC-03, PED-05 |
| Returns | Posventa | Inspección logística y aprobación del vendedor, crédito a favor ([ADR-0018](../Adr/0018-devoluciones-confianza-recepcion-responsabilidad.md)) | EXC-02, DEV-01, DEV-05 |
| Billing | Facturación | Factura maestra, detalle de plataforma y un detalle por vendedor (FAC-01, FAC-03) | FAC-01, FAC-02, FAC-03, PED-03 |
| Buyers | Perfil de compra | Direcciones (principal obligatoria) y estado comercial | inv. 17, inv. 18 |
| Payments | Resultado del cobro | Comprobante de pago con pasarela simulada; sin custodia de fondos | inv. 9 (sin código) |

> **Lectura de la columna `Reglas`:** los códigos apuntan a las familias `INV`, `PED`, `CAT`, `EXC`, `DEV` y `FAC` definidas en [`06-business-rules.md`](06-business-rules.md); las reglas sin código viven numeradas del 1 al 18 en [`04-invariants-and-rules.md`](04-invariants-and-rules.md). `INV-05` (bloqueo de vendedor) es transversal: cierra el acceso del usuario y el checkout rechaza carritos con sus productos; **ya no cascadea a catálogo ni inventario** (decisión del Owner 2026-10-04).

> **Sobre la numeración de los archivos:** es temática, no ordinal. Los prefijos se comparten a propósito (`01-models` junto a `01-domain-overview`, los pares `02-`, `03-` y `04-`) porque agrupan por tema. **No es un orden de lectura**: entra por el módulo que te interesa y sigue el enlace.

> **Sobre el estado de implementación:** no vive en este documento, y su ausencia es deliberada. Cada regla lleva su marca `[NO IMPLEMENTADO]` en el documento donde está escrita, y el estado global con las preguntas abiertas está en [`../orchestrator-state.md`](../orchestrator-state.md) §9. Un índice que dice qué falta se contradice solo en cuanto avanza el código.

**Patrón arquitectónico y límite de contexto:** ver
[`../02-software-architecture.md`](../02-software-architecture.md) y
`01-models.md`.
