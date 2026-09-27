# 01. Domain Overview (Visión General)

> **Documento consolidado (2026-09-27).** La visión general de módulos y el
> patrón arquitectónico que aquí se describían se incorporaron a
> [`01-models.md`](01-models.md) (visión del dominio) y a
> [`../02-software-architecture.md`](../02-software-architecture.md) (patrón
> arquitectónico). Este archivo queda como **índice de navegación** del
> subárbol `Domain/`, sin duplicar contenido.
>
> Motivo de la consolidación: `01-domain-overview.md` y `01-models.md` se
> solapaban, lo que obligaba a mantener la misma verdad en dos lugares y ya
> había producido divergencias (p. ej. nombres de método inexistentes en
> `01-models.md`, corregidos contra el código).

## Índice del dominio

| Documento | Contenido |
|---|---|
| [`01-models.md`](01-models.md) | Aggregate Roots y entidades por Bounded Context, con métodos verificados contra el código |
| [`02-aggregates-and-entities.md`](02-aggregates-and-entities.md) | Responsabilidades y límites transaccionales de cada agregado |
| [`02-value-objects.md`](02-value-objects.md) | Value Objects, enumeraciones y la política de moneda por defecto |
| [`03-domain-services.md`](03-domain-services.md) | Servicios de dominio |
| [`04-domain-events.md`](04-domain-events.md) | Eventos de dominio |
| [`04-invariants-and-rules.md`](04-invariants-and-rules.md) | Invariantes estrictas |
| [`05-ports.md`](05-ports.md) | Puertos de salida del dominio |
| [`06-business-rules.md`](06-business-rules.md) | Reglas de negocio transversales |
| [`07-lifecycle.md`](07-lifecycle.md) | Ciclo de vida de las entidades |
| [`services/`](services/) | Servicios de dominio con semántica particular |

## Módulos del dominio (resumen)

| Módulo | Responsabilidad | Conceptos clave |
|---|---|---|
| Identity | Usuarios y estado comercial de los participantes | Unicidad de documento, un solo rol por usuario, bloqueos |
| Catalog | Oferta de vendedores hacia compradores | Producto y Variantes (SKU), publicación y suspensión reactiva, físico vs digital |
| Inventory | Dónde están las cosas físicas y cuántas hay | Control por Variante y Bodega, bodegas Marketplace vs Vendor |
| Ordering | Intención de compra convertida en contrato | Carrito vs Pedido formal, reservas con *timeout*, factura centralizada, retracto |
| Fulfillment | Pedido maestro traducido a órdenes de trabajo por vendedor | Fragmentación Master-Detail, quiebres de stock, devoluciones con verificación dual |
| Returns | Posventa | Inspección logística y aprobación del vendedor |
| Billing | Facturación | Factura maestra, detalle de plataforma y split por vendedor |

**Patrón arquitectónico y límite de contexto:** ver
[`../02-software-architecture.md`](../02-software-architecture.md) y
`01-models.md`.
