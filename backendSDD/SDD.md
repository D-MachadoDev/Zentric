# SDD — Índice Maestro del Backend

> **Este fichero es un indice, no la especificacion.** Si buscas una regla de negocio esta en
> `Domain/`, si buscas un endpoint esta en `Presentation/`, si buscas una decision esta en
> `Adr/`, y si buscas donde quedamos esta en `orchestrator-state.md`.

> **Principio:** la especificacion describe **QUE** debe hacer el sistema, no **COMO**. Si nada
> de lo que hay aqui impone una tecnologia, este mismo sistema puede construirse con otro
> stack y comportarse igual. El codigo es un resultado que cumple la especificacion.
>
> **Alcance:** el nucleo portable es `ZENTRIC.md`, `Domain/` y los contratos HTTP
> de `Presentation/`: ahi no se impone stack. `Application/`, `Infrastructure/` y
> las decisiones de `Adr/` documentan la implementacion .NET/EF Core **vigente y construida**:
> citan tecnologia a proposito, para que el sistema actual sea reproducible sin preguntas.

## Donde esta cada cosa

| Documento | Que contiene |
|---|---|
| [`ZENTRIC.md`](../ZENTRIC.md) | La Ley. Dominio e invariantes. Intocable. |
| [`Domain/`](Domain/) | Modelos, agregados, value objects, invariantes, puertos y reglas de negocio. |
| [`Application/`](Application/) | Casos de uso, puertos de entrada y orquestacion. |
| [`Infrastructure/`](Infrastructure/) | Persistencia, despliegue, servicios de fondo y el mapa de entidades. |
| [`Presentation/`](Presentation/) | Contratos REST (OpenAPI), matriz de autorizacion por rol y manejo global de errores (RFC 7807). |
| [`Adr/`](Adr/) | Una decision cada una, con sus alternativas descartadas y el porque. |
| [`Contract-alignment.md`](Contract-alignment.md) | Politica contractual transversal y trazabilidad cliente-servidor. |
| [`Backend-Cors-Security.md`](Backend-Cors-Security.md) | Origen permitido, cabeceras, JWT, preflight y pruebas CORS. |
| [`orchestrator-state.md`](orchestrator-state.md) | Estado, riesgos, preguntas abiertas, gates y bitacora. |

## Si eres nuevo

1. Lee el **glosario** del final de este documento: resuelve `Q-21b`, `H-15`, `R-08`, `ADR-0013` y el
   resto de identificadores que el codigo cita. Saltarselo es la razon mas comun por la que este
   repositorio parece criptico cuando no lo es.
2. Sigue el orden de lectura de [`orchestrator-state.md`](orchestrator-state.md#orden-de-lectura-para-replicar-este-backend-con-otro-stack).

---

## 6. Índice de especificaciones (SSoT)

> Este orquestador **no duplica** las especificaciones: las indexa. Los documentos canónicos viven en `/backendSDD/` y en la raíz del repositorio.

### 6.1 Documentos normativos y de panorama

| Documento | Contenido | Rol |
|---|---|---|
| [ZENTRIC.md](../ZENTRIC.md) | Ley funcional del cliente (reglas RG, dominios 1–11, roles) + `[ADDENDUM - DICTADO POR OWNER]` | **Congelada (Biblia)** — intocable; ADDENDA registradas en la [sección 8.2 de orchestrator-state](orchestrator-state.md#82-adiciones-a-la-biblia-addendum---dictado-por-owner-en-zentricmd) |
| [AGENTS.md](../AGENTS.md) | Contrato operativo de agentes: arquitectura hexagonal, reglas por capa, DoD, comandos | Normativo |
| [01-system-overview.md](01-system-overview.md) | Negocio global, alcance incluido/excluido, glosario de contexto | Panorama |
| [02-software-architecture.md](02-software-architecture.md) | Arquitectura hexagonal, regla de dependencia, capas y puertos | Panorama |
| `README.md` (raíz) | Presentación técnica integral del repositorio (matriz tecnológica, diagramas, guía de arranque) | Divulgación |

### 6.2 Dominio — `backendSDD/Domain/`

| Documento | Contenido |
|---|---|
| [01-domain-overview.md](Domain/01-domain-overview.md) | Visión general del dominio y bounded contexts |
| [01-models.md](Domain/01-models.md) | Modelos por contexto: agregados, entidades, propiedades |
| [02-aggregates-and-entities.md](Domain/02-aggregates-and-entities.md) | Agregados, entidades y relaciones |
| [02-value-objects.md](Domain/02-value-objects.md) | Value Objects y enumeraciones |
| [03-domain-services.md](Domain/03-domain-services.md) | Servicios de dominio (reserva, split, timeout, devoluciones) |
| [04-domain-events.md](Domain/04-domain-events.md) | Eventos de dominio y mensajería |
| [04-invariants-and-rules.md](Domain/04-invariants-and-rules.md) | Invariantes estrictas (lista numerada) |
| [05-ports.md](Domain/05-ports.md) | Puertos de repositorio y de mensajería |
| [06-business-rules.md](Domain/06-business-rules.md) | Reglas de negocio catalogadas (INV, CAT, PED, DEV, RG…) |
| [07-lifecycle.md](Domain/07-lifecycle.md) | Máquinas de estado críticas (pedido, despacho, devolución) |
| [services/inventory-reservation-service.md](Domain/services/inventory-reservation-service.md) | Especificación de reserva atómica de stock en checkout |
| [services/order-fulfillment-progress-synchronizer.md](Domain/services/order-fulfillment-progress-synchronizer.md) | Especificación de sincronización de avance del pedido maestro |
| [services/returns-approval-service.md](Domain/services/returns-approval-service.md) | Especificación de doble verificación de devoluciones físicas |
| [services/refund-policy-service.md](Domain/services/refund-policy-service.md) | Especificación de clasificación de reembolsos (automático vs. excepción) |

✅ **RESUELTO (verificado 2026-09-27)** **Q-06:** `backendSDD/Domain/` ya no conserva parejas numeradas solapadas. `01-domain-overview.md` quedó como **índice de navegación** sin duplicar contenido (su visión y el patrón arquitectónico se movieron a `01-models.md` y `02-software-architecture.md`); los pares `02-aggregates`/`02-value-objects` y `04-domain-events`/`04-invariants-and-rules` tienen responsabilidades distintas y ya no se solapan. Nombres de método corregidos contra el código real (`Block()`/`Activate()`/`UpdateRole()`).

### 6.3 Aplicación, infraestructura y presentación

| Documento | Contenido |
|---|---|
| [Application/01-use-cases-and-ports.md](Application/01-use-cases-and-ports.md) | Casos de uso CQRS y puertos de la capa de aplicación |
| [Infrastructure/01-data-access.md](Infrastructure/01-data-access.md) | Persistencia EF Core, `DbModel`, mappers, repositorios y migraciones |
| [Infrastructure/02-containerization-and-deployment.md](Infrastructure/02-containerization-and-deployment.md) | Dockerfile, docker-compose y despliegue |
| [Infrastructure/03-background-services.md](Infrastructure/03-background-services.md) | Background services (expiración de checkout) |
| [Presentation/01-endpoints.md](Presentation/01-endpoints.md) | Catálogo de los 44 endpoints REST, seguridad OpenAPI y Problem Details |
| [Presentation/02-authorization.md](Presentation/02-authorization.md) | Matriz de autorización por rol (RG-03): 20 políticas, los 44 endpoints, cómo se deduce

### 6.4 ADRs — `backendSDD/Adr/` (decisiones vigentes)

| ADR | Título | Estado |
|---|---|---|
| [0001](Adr/0001-reserva-fragmentacion-contingencia.md) | Reserva de inventario: bodega única con fraccionamiento de contingencia | accepted (2026-09-17) |
| [0002](Adr/0002-clave-inventario-variantid.md) | Clave del inventario: `VariantId` (SKU) | accepted (2026-09-17) |
| [0003](Adr/0003-variante-obligatoria-productos-fisicos.md) | Variante obligatoria solo para productos físicos | accepted (2026-09-17) |
| [0004](Adr/0004-estado-cancelacion-despacho.md) | Estado de cancelación de despacho | accepted |
| [0005](Adr/0005-modelado-carrito-compras.md) | Modelado del carrito de compras (`Cart` como estado con timeout) | accepted |
| [0006](Adr/0006-resolucion-contradiccion-ley-addendum.md) | Precedencia del ADDENDUM sobre la Ley original (C-08/Q-13) | accepted (2026-09-19) |
| [0007](Adr/0007-dispatcher-propio-sustituye-mediatr.md) | Dispatcher propio en lugar de MediatR (licencia RPL) | accepted (2026-09-27) |
| [0008](Adr/0008-transportadora-y-tarifa-de-envio.md) | Transportadora y tarifa de envío | accepted |
| [0009](Adr/0009-autenticacion-jwt-rg01.md) | Autenticación real con JWT (RG-01), hash PBKDF2 en el servidor | accepted (2026-09-28) |
| [0010](Adr/0010-relojo-como-puerto-iclock.md) | El tiempo entra al modelo por el puerto `IClock` | accepted (2026-09-29) |
| [0011](Adr/0011-matriz-autorizacion-por-rol.md) | Matriz de autorización por rol en un solo archivo, `FallbackPolicy` fail-closed y verificación por reflexión (Q-21 / RG-03) | accepted (2026-09-29) |
| [0012](Adr/0012-contrato-json-de-los-enum-por-nombre.md) | Los `enum` del contrato REST viajan solo por nombre (Q-22) | accepted (2026-09-29) |
| [0013](Adr/0013-propiedad-del-recurso-por-rol.md) | Propiedad del recurso por rol, con la identidad de vendedor derivada del token (Q-21b) | accepted (2026-09-29) |
| [0014](Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md) | Tres enmiendas a la matriz de roles: quién cancela por quiebre, quién factura y qué es el Supervisor (Q-21c, Q-21d, Q-21e) | accepted (2026-09-30) |
| [0015](Adr/0015-contrato-de-error-http-problem-json.md) | Contrato de error HTTP: `application/problem+json` obligatorio | accepted (2026-10-01) |
| [0016](Adr/0016-pruebas-e2e-http-con-postgres-efimero.md) | Pruebas E2E HTTP con PostgreSQL efímero (Testcontainers) | accepted (2026-10-01) |
| [0017](Adr/0017-listados-de-recurso-propio.md) | Listados de recurso propio: el filtro lo decide el rol (pedidos, despachos, devoluciones, facturas, inventario) | accepted (2026-09-30) |
| [0018](Adr/0018-devoluciones-confianza-recepcion-responsabilidad.md) | Devoluciones: inspección, lugar de recepción y responsabilidad económica del reembolso | accepted (2026-10-03) |

### 6.5 Specs activas (códigos SPEC)

| ID | Spec | Estado |
|---|---|---|
| SPEC-000 | Adopción SDD (bootstrap brownfield) | hecha |
| SPEC-001 | Ley funcional Zentric | congelada (Biblia) |
| SPEC-002 | Dominio (modelos, reglas, invariantes, puertos, eventos, ciclo de vida) | viva |
| SPEC-003 | Aplicación (casos de uso y puertos) | viva |
| SPEC-004 | Infraestructura (EF Core, mapeos, migraciones, background services, Docker) | viva |
| SPEC-005 | Presentación (endpoints REST + OpenAPI) | viva |
| SPEC-006 | Trazabilidad de la tanda no registrada (T-011…T-022) | hecha |
| SPEC-007 | Validación de entrada + RFC 9457 + higiene (H-09/H-11/H-12) | hecha |


## 19. Glosario de códigos de trazabilidad

> **Por qué existe esta sección.** El código y las especificaciones citan identificadores cortos
> (`Q-21b`, `H-15`, `T-004`, `R-08`). Son útiles porque apuntan a una decisión concreta en vez de
> repetirla entera, pero **sin este índice son ininteligibles para quien no conoce la historia del
> proyecto**. Un lector nuevo no debería tener que leer 1152 líneas para descubrir qué significa
> `Q-21b`. Este apartado es el punto de entrada: se resuelve aquí y se sigue el enlace.

### 19.1 Familias y qué representa cada una

| Prefijo | Significado | Dónde se resuelve |
|---|---|---|
| `Q-` | **Pregunta** planteada al Owner que aún no tenía respuesta. `Q-05`, `Q-21b` | [`orchestrator-state.md`](orchestrator-state.md) §9 y §8.3 |
| `ADR-NNNN` | **Decisión de arquitectura** adoptada, con sus alternativas descartadas | [`Adr/`](Adr/) |
| `H-` | **Hallazgo** de defecto encontrado en el código, con su estado | [`orchestrator-state.md`](orchestrator-state.md) §10.1 |
| `R-` | **Riesgo** vigente (backend) | [`orchestrator-state.md`](orchestrator-state.md) §10.2 |
| `OBS-` | **Observación** de calidad o consistencia | [`orchestrator-state.md`](orchestrator-state.md) §10.2 |
| `T-` | **Tarea** de un plan de ejecución | [`orchestrator-state.md`](orchestrator-state.md) §4 y §12.1 |
| `E-` | **Entidad** del mapa de dominio (anti-amnesia) | [`Infrastructure/03-entity-map.md`](Infrastructure/03-entity-map.md) |
| `SPEC-` / `FR-` | **Especificación** de fase y sus criterios de aceptación | [`orchestrator-state.md`](orchestrator-state.md) §18 y §11.4 |
| `PED-` | **Regla de negocio** del glosario de `Domain/` | [`Domain/06-business-rules.md`](Domain/06-business-rules.md) |

### 19.2 El prefijo `R-` está duplicado — aviso importante

`R-` significa **dos cosas distintas** según dónde se lea, y esto es un defecto real del
repositorio, no una convención:

| Namespace | Qué significa | Dónde vive |
|---|---|---|
| `R-06`, `R-08`, `R-09`… | Riesgos del **backend** (este documento, §10.2) | [`orchestrator-state.md`](orchestrator-state.md) §10.2 |
| `R-04`…`R-08` | Brechas de **integración con el frontend** (auditoría de contrato) | `frontendSDD/Contract-alignment.md`, `frontendSDD/Frontend-Adapters.md` |

`R-06` designa "reloj directo" en un sitio y "devolver `variantId` en el alta de producto" en el
otro. `R-08` designa "analizadores no activados" y "reportes administrativos". Mientras coexistan,
**una cita de `R-08` es ambigua y no debe resolverse por suposición**.

**Regla vigente:** `orchestrator-state.md` §10.2 es el namespace canónico de riesgos del backend. Los
códigos de brecha del frontend son un namespace separado. Para evitar que un `R-06` en el código se
lea con el significado equivocado, **el código ya no cita riesgos**: las auditorías que
enumeraron brechas se resolvieron **eliminando el código del comentario** y dejando la
explicación en palabras. Un comentario que dice *"antes solo existía `GET /api/Orders/{id}`"* se
entiende sin saber nada del proyecto; uno que dice *"R-04"* no.

Las referencias a `Q-`, `H-` y `ADR-` **sí se mantienen** en el código, porque esos códigos tienen
un único significado, están indexados aquí y son el mecanismo que garantiza que una decisión no se
pierda. Se citan siempre **junto a la explicación**, nunca en lugar de ella.

### 19.3 Glosario de términos del negocio

| Término                                              | Significado                                                                                                                                                                                                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Comprador** (`Buyer`)                              | Persona que adquiere productos. Es el dueño de un pedido y quien puede devolverlo.                                                                                                                                                       |
| **Vendedor** (`Seller` / `Vendor`)                   | Persona que publica productos. Es el dueño de un producto, un pedido, una bodega o una devolución. **El código usa `Vendor`; el rol del token es `Seller`:** el mismo actor con dos nombres, uno para la entidad y otro para el permiso. |
| **Operador Logístico** (`LogisticsOperator`)         | Quien prepara, empaca, despacha y entrega en bodega. Trabaja sobre materiales, no sobre cuentas.                                                                                                                                         |
| **Administrador** (`Administrator`)                  | Único que emite facturas y ejecuta reembolsos.                                                                                                                                                                                           |
| **Supervisor** (`Supervisor`)                        | Rol de **solo lectura y auditoría**. Sin módulo propio, por dictamen del Owner.                                                                                                                                                          |
| **Pedido** (`CustomerOrder`)                         | Lo que compra el Comprador. Puede tener líneas de varios vendedores.                                                                                                                                                                     |
| **Despacho** (`FulfillmentOrder`)                    | La porción de un pedido que corresponde a un vendedor. Un pedido multi-vendedor genera varios.                                                                                                                                           |
| **Factura Maestra** (`InvoiceType.Master`)           | Lo que paga el Comprador: el total de la operación.                                                                                                                                                                                      |
| **Detalle Zentric** (`InvoiceType.ZentricDetail`)    | Comisión de la plataforma. **Control interno: ni el Comprador ni el Vendedor la ven.**                                                                                                                                                   |
| **Detalle de vendedor** (`InvoiceType.VendorDetail`) | La parte de un vendedor tras descontar la comisión. Solo la ve ese vendedor.                                                                                                                                                             |
| **Devolución** (`ReturnRequest`)                     | Solicitud del Comprador para devolver un producto entregado. El Vendedor aprueba o rechaza; el Administrador reembolsa.                                                                                                                  |
| **Quiebre de stock** (`Stock fantasma`)              | El sistema cree que hay existencias y en bodega no están. Se resuelve cancelando el despacho, y lo reporta quien está en la bodega.                                                                                                      |
