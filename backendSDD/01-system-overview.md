# 01. System Overview — Zentric

> Documento exigido por [AGENTS.md:0.1](../AGENTS.md#01-consulta-obligatoria-antes-de-codificar). **Derivado**, no inventado: consolida y
> enlaza la especificación funcional de negocio existente
> ([ZENTRIC.md](../ZENTRIC.md)) y los documentos de dominio. No introduce reglas
> nuevas. Todo lo marcado `[INFERIDO]` requiere confirmación.

## 1. Qué es Zentric

`[CONFIRMADO]` [ZENTRIC.md](../ZENTRIC.md): plataforma digital centralizada que
actúa como **intermediario comercial** entre compradores y vendedores. Administra
la operación completa: registro de usuarios, publicación de productos, logística,
facturación y posventa, con trazabilidad y coordinación entre participantes.

## 2. Objetivos estratégicos

`[CONFIRMADO]` [ZENTRIC.md](../ZENTRIC.md):

| Código | Objetivo |
|---|---|
| OBJ-01 | Administrar la información de todos los usuarios del Marketplace |
| OBJ-02 | Gestionar el registro y administración de vendedores |
| OBJ-03 | Administrar compradores registrados |
| OBJ-04 | Controlar la información de las bodegas |
| OBJ-05 | Gestionar el catálogo de productos |
| OBJ-06 | Administrar el inventario distribuido |
| OBJ-07 | Gestionar el carrito de compras |
| OBJ-08 | Controlar el ciclo completo de los pedidos |
| OBJ-09 | Administrar la facturación de las compras |
| OBJ-10 | Gestionar los procesos logísticos |
| OBJ-11 | Administrar devoluciones y reembolsos |
| OBJ-12 | Consolidar información administrativa para consulta |

## 3. Alcance

`[CONFIRMADO]` [ZENTRIC.md](../ZENTRIC.md) incluye: registro de compradores, administración
de usuarios, registro **administrativo** de vendedores, administración de bodegas,
catálogo, inventario, carrito, pedidos, facturación, envíos, devoluciones,
reembolsos y consulta de reportes administrativos.

`[CONFIRMADO]` [ZENTRIC.md](../ZENTRIC.md) excluye explícitamente: interfaces gráficas,
aplicaciones móviles, portales web, mecanismos de autenticación técnica,
tecnologías de implementación, arquitectura del software y almacenamiento de la
información. **Este repositorio cubre el core de dominio y su API, no la UI.**

## 4. Participantes y roles

`[CONFIRMADO]` [ZENTRIC.md](../ZENTRIC.md): Comprador, Vendedor, Operador Logístico,
Administrador y Supervisor. Cada participante desempeña **un único rol**.

`[CONFIRMADO]` [AGENTS.md :1](../AGENTS.md#1-vision-general-del-proyecto) enumera: vendedores, compradores, bodegas,
productos, catálogos y pedidos.

## 5. Modelo operativo (flujo extremo a extremo)

`[CONFIRMADO]` [ZENTRIC.md](../ZENTRIC.md):

1. **Incorporación** — el Administrador registra al vendedor y su primera bodega.
2. **Catálogo** — el vendedor registra productos y características.
3. **Inventario** — se registran existencias iniciales en las bodegas.
4. **Publicación** — los productos se hacen visibles en el catálogo.
5. **Compra** — el comprador selecciona productos vía carrito y confirma.
6. **Transacción** — se valida el pago y se inicia la preparación.
7. **Logística** — empaque, despacho y transporte.
8. **Cierre** — el pedido se marca finalizado tras entrega confirmada.

## 6. Bounded context y módulos

`[CONFIRMADO]` [backendSDD/Domain/01-domain-overview.md](Domain/01-domain-overview.md): **un único Bounded Context
(Unified Domain)** dividido en módulos de dominio de alta cohesión.

| Módulo | Responsabilidad | Documento de referencia |
|---|---|---|
| Identity | Usuarios y estado comercial de participantes | [backendSDD/Domain/01-models.md :1](Domain/01-models.md#1-bounded-context-identity-access-usuarios) |
| Catalog | Oferta de vendedores, productos y variantes | [backendSDD/Domain/01-models.md :2](Domain/01-models.md#2-bounded-context-catalog-catalogo) |
| Inventory | Inventario distribuido, bodegas y cantidades | [backendSDD/Domain/01-models.md :3](Domain/01-models.md#3-bounded-context-inventory-inventario-y-bodegas) |
| Ordering | Carrito, pedido maestro, facturación centralizada | [backendSDD/Domain/01-models.md :4](Domain/01-models.md#4-bounded-context-ordering-pedidos---interfaz-del-comprador) |
| Fulfillment | Órdenes de despacho por vendedor y posventa | [backendSDD/Domain/01-models.md :5](Domain/01-models.md#5-bounded-context-fulfillment-logistics-despachos---interfaz-del-vendedor) |
| Returns | Devolución con doble aprobación y vuelta a stock usado | [backendSDD/Domain/01-models.md §6](Domain/01-models.md) |
| Billing | Factura maestra, detalles y comisión de plataforma | [backendSDD/Domain/01-models.md §7](Domain/01-models.md) |
| Buyers | Direcciones y estado comercial del comprador | [backendSDD/Domain/01-models.md §8](Domain/01-models.md) |
| Payments | Comprobante de cobro y crédito a favor | [backendSDD/Domain/01-models.md §9](Domain/01-models.md) |

## 7. Restricciones transversales

`[CONFIRMADO]` [ZENTRIC.md](../ZENTRIC.md) y [:11](../ZENTRIC.md#11-validaciones-criticas):

| Código | Restricción |
|---|---|
| RG-01 | Toda operación debe ejecutarse por un usuario autenticado |
| RG-02 | Cada usuario tendrá un único rol dentro del sistema |
| RG-03 | Ningún participante podrá administrar información fuera de su rol |

Validaciones críticas: no reservar inventario inexistente o marcado como dañado ·
un pedido finalizado no puede modificarse · documento de identidad y correo
electrónico únicos en la plataforma.

## 8. Reglas de negocio consolidadas

`[CONFIRMADO]` El catálogo canónico de reglas vive en:

- [backendSDD/Domain/06-business-rules.md](Domain/06-business-rules.md): [INV-01](Domain/06-business-rules.md), [INV-02](Domain/06-business-rules.md), [INV-03](Domain/06-business-rules.md), [PED-01](Domain/06-business-rules.md), [PED-02](Domain/06-business-rules.md), [PED-03](Domain/06-business-rules.md),
  [CAT-01](Domain/06-business-rules.md), [CAT-02](Domain/06-business-rules.md), [CAT-03](Domain/06-business-rules.md), [EXC-01](Domain/06-business-rules.md), [EXC-02](Domain/06-business-rules.md), [DEV-01](Domain/06-business-rules.md), [FAC-01](Domain/06-business-rules.md).
- [backendSDD/Domain/04-invariants-and-rules.md](Domain/04-invariants-and-rules.md): [invariantes 1–13](Domain/04-invariants-and-rules.md) (inventario,
  catálogo, pagos, posventa).
- [backendSDD/Domain/07-lifecycle.md](Domain/07-lifecycle.md): máquinas de estado de `CustomerOrder` y
  `FulfillmentOrder`.

`[RESUELTO]` Las contradicciones de reglas del dominio quedaron resueltas el
2026-09-17:

- **[C-01](SDD.md)** ([INV-02](Domain/06-business-rules.md) vs [invariante 3](Domain/04-invariants-and-rules.md)) → [backendSDD/Adr/0001-reserva-fragmentacion-contingencia.md](Adr/0001-reserva-fragmentacion-contingencia.md): bodega única con
  fraccionamiento de contingencia.
- **[C-02](SDD.md)** (clave de stock `ProductId` vs `VariantId`) → [backendSDD/Adr/0002-clave-inventario-variantid.md](Adr/0002-clave-inventario-variantid.md):
  el inventario se lleva por `VariantId` (SKU).
- **[Q-10](orchestrator-state.md)** (¿variante obligatoria?) → [backendSDD/Adr/0003-variante-obligatoria-productos-fisicos.md](Adr/0003-variante-obligatoria-productos-fisicos.md): obligatoria solo en
  `Physical` ([CAT-03](Domain/06-business-rules.md)), aplicado en código (551/551 pruebas verificadas 2026-10-06). Sub-decisiones
  de ADR-0003 **ratificadas** el 2026-09-27 (Q-12, ver [orchestrator-state §9.1](orchestrator-state.md)).

Reglas vigentes de inventario: **[INV-01](Domain/06-business-rules.md), [INV-02](Domain/06-business-rules.md), [INV-03](Domain/06-business-rules.md)** ([06-business-rules.md](Domain/06-business-rules.md)).

El registro canónico de preguntas vive en [orchestrator-state.md §9](orchestrator-state.md). Riesgo abierto conocido: falta el módulo de **reportes administrativos** (OBJ-12; brecha registrada en [`frontendSDD/Contract-alignment.md`](../frontendSDD/Contract-alignment.md)).

## 9. Estado de implementación

Backend completo: **44 endpoints + `GET /health`, 580/580 pruebas en verde (2026-10-09), build 0 warnings**, capas Domain/Application/Infrastructure/Api montadas y verificadas contra PostgreSQL. Contrato HTTP: [Presentation/01-endpoints.md](Presentation/01-endpoints.md). Estado de sesión y roadmap: [orchestrator-state.md](orchestrator-state.md).
