# Zentric Marketplace — Fullstack Core & Domain Platform

[![.NET 10](https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.15--alpine-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-592%20Passing%20(100%25)-brightgreen?style=for-the-badge&logo=xunit)](https://xunit.net/)
[![Architecture](https://img.shields.io/badge/Architecture-Hexagonal%20%2B%20DDD%20%2B%20CQRS-orange?style=for-the-badge)](./backendSDD/02-software-architecture.md)
[![Methodology](https://img.shields.io/badge/Methodology-SDD%20%2B%20ODD-blue?style=for-the-badge)](./AGENTS.md)
[![Orchestration](https://img.shields.io/badge/Orchestrator-13%20Agents%20(DAG)-purple?style=for-the-badge)](./.agents/orchestration/master-orchestrator.prompt.md)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

Plataforma empresarial de comercio electrónico y marketplace multi-vendedor **Zentric**. Diseñada bajo principios rigurosos de ingeniería de software: **Arquitectura Hexagonal (Puertos y Adaptadores)**, **Domain-Driven Design (DDD)** táctico, segregación de responsabilidades con **CQRS**, y gobernada mediante **Spec-Driven Development (SDD)** y **Outcome-Driven Development (ODD)** a través de una flota coordinada de 13 agentes especializados.

---

## 📑 Tabla de Contenidos
1. [Inicio Rápido (Quick Start)](#-inicio-rápido-quick-start)
2. [Visión General del Negocio](#-visión-general-del-negocio)
3. [Estructura de Especificación (SDD)](#-estructura-de-especificación-sdd)
4. [Arquitectura del Sistema (Hexagonal + DDD + CQRS)](#-arquitectura-del-sistema)
5. [Modelado Táctico de Dominio y Lenguaje Ubicuo](#-modelado-táctico-de-dominio-y-lenguaje-ubicuo)
6. [Registro de Decisiones Arquitectónicas (ADRs)](#-registro-de-decisiones-arquitectónicas-adrs)
7. [Contrato de API REST y Catálogo de Endpoints](#-contrato-de-api-rest-y-catálogo-de-endpoints)
8. [Flujo Operativo de Negocio](#-flujo-operativo-de-negocio)
9. [Tratamiento Estandarizado de Errores (RFC 7807)](#-tratamiento-estandarizado-de-errores-rfc-7807)
10. [Instalación y Despliegue](#-instalación-y-despliegue)
11. [Pruebas Automatizadas y Calidad](#-pruebas-automatizadas-y-calidad)
12. [Orquestación Multi-Agente y Gobernanza SDD + ODD](#-orquestación-multi-agente-y-gobernanza-sdd--odd)
13. [Matriz de Trazabilidad Técnica](#-matriz-de-trazabilidad-técnica)

---

## ⚡ Inicio Rápido (Quick Start)

El entorno completo está contenerizado para permitir su ejecución inmediata:

```bash
# 1. Clonar el repositorio
git clone https://github.com/D-MachadoDev/Zentric.git
cd Zentric

# 2. Iniciar PostgreSQL 16.15-alpine y la API en contenedores
docker compose up -d --build

# 3. Acceder a la documentación interactiva OpenAPI en el navegador:
# http://localhost:5076/swagger
```

Para compilar y ejecutar la suite de pruebas automatizadas en local (.NET 10 SDK):
```bash
# Compilar con advertencias como errores
dotnet build backend/Zentric.slnx -warnaserror

# Ejecutar la suite de pruebas unitarias
dotnet test backend/Zentric.slnx --filter "FullyQualifiedName!~E2E" --no-build
```

---

## 🏢 Visión General del Negocio

**Zentric** gestiona la operación integral de un marketplace multi-vendedor con logística distribuida, múltiples centros de almacenamiento y catálogo heterogéneo:

- **Consistencia de Inventario:** Control atómico de existencias por bodega física y variante (SKU), evitando sobreventa y quiebres por stock fantasma.
- **Reserva Preventiva en Checkout:** Retención atómica de stock en bodegas con menor carga operativa al iniciar checkout, con expiración automática de **15 minutos** gestionada por el trabajador `CheckoutTimeoutService` si el pago no se confirma.
- **Logística y Despachos:** Subdivisión de pedidos de compra en órdenes logísticas de despacho individuales por vendedor y bodega de origen.
- **Posventa y Garantías:** Solicitudes de devolución con validación de período de garantía legal, inspección técnica física en bodega y reincorporación controlada al stock usado o reacondicionado.
- **Facturación y Liquidación:** Emisión de Factura Maestra consolidada para el comprador, facturas split de detalle para cada vendedor y desglose interno de comisión de plataforma.

---

## 📖 Estructura de Especificación (SDD + ODD)

El desarrollo del proyecto se rige por **Spec-Driven Development (SDD)** y **Outcome-Driven Development (ODD)**, manteniendo sincronización bidireccional estricta entre la especificación técnica (`backendSDD/` y `frontendSDD/`) y el código fuente:

```mermaid
flowchart TD
    B1["1. ZENTRIC.md (La Ley)<br/>Especificación funcional pura del cliente.<br/>Invariantes de negocio y dominios 1 a 11."]
    B2["2. Decisiones y ADRs (backendSDD/Adr/)<br/>25 Architecture Decision Records aprobados.<br/>Definiciones tácticas y consensos inmutables."]
    SSOT_B["3A. Especificación Backend (backendSDD/)<br/>Domain, Application, Infrastructure, Presentation.<br/>Modelos, puertos, eventos y 44 endpoints."]
    SSOT_F["3B. Especificación Frontend (frontendSDD/)<br/>Modelo C4 Niveles 1 a 4, Design System,<br/>Adapters, Role Modules y Domain Services."]
    CODE_B["4A. Código Backend (.NET 10)<br/>C# Puro en Dominio, CQRS Handlers, FluentValidation,<br/>EF Core con 14 DbSets y 592 pruebas continuas."]
    CODE_F["4B. Código Frontend (React 19 + Vite)<br/>Monorepo Turborepo + pnpm, TanStack Router/Query,<br/>Tailwind v4 (@theme) y shadcn/ui."]

    B1 --> SSOT_B
    B1 --> SSOT_F
    B2 --> SSOT_B
    SSOT_B --> CODE_B
    SSOT_F --> CODE_F
    SSOT_B -.->|Contratos OpenAPI & Mocks| SSOT_F
```

| Nivel de Verdad | Documento | Propósito Arquitectónico |
| :--- | :--- | :--- |
| **Nivel 1: La Ley** | [`ZENTRIC.md`](./ZENTRIC.md) | Documento funcional original. Intocable en su redacción. Excluye explícitamente elecciones de base de datos, UI y tecnologías de persistencia. |
| **Nivel 2: Addenda del Owner** | Addenda en `ZENTRIC.md` | Resoluciones formales dictadas por el Owner para resolver ambigüedades operativas de la Ley. |
| **Nivel 3: Decisiones de Arquitectura** | [`ADR-0001` a `ADR-0025`](./backendSDD/Adr/) | Registros inmutables de diseño (reserva atómica, VariantId, carritos, JWT, propiedad del recurso, split de pagos, stock no negativo, etc.). |
| **Nivel 4A: SSoT Backend** | [`backendSDD/SDD.md`](./backendSDD/SDD.md) y [`backendSDD/`](./backendSDD/) | Catálogo maestro de backend: modelos, 18 invariantes, 22 comandos, 14 consultas, 14 DbSets y 44 endpoints REST. |
| **Nivel 4B: SSoT Frontend** | [`frontendSDD/Frontend-SDD.md`](./frontendSDD/Frontend-SDD.md) y [`frontendSDD/`](./frontendSDD/) | Catálogo maestro de frontend: arquitectura C4 (Contexto, Contenedores, Componentes, Código), Design System, adaptadores HTTP y vistas por rol. |
| **Nivel 5: Implementación Técnica** | `backend/` y `frontend/` | Código fuente concreto estructurado bajo Arquitectura Hexagonal y verificado mediante suites automatizadas con cobertura >= 90%. |

---

## 🏛 Arquitectura del Sistema

La solución implementa una **Arquitectura Hexagonal (Puertos y Adaptadores)** con separación estricta de responsabilidades hacia el centro:

```mermaid
flowchart TD
    subgraph Presentation ["Presentación (Zentric.Api) — Composition Root"]
        CTRL["Controladores REST (44 Endpoints + /health)"]
        SWAGGER["OpenAPI v1 / Swagger UI (Bearer JWT)"]
        AUTH["Matriz de Autorización (21 Políticas Fail-Closed)"]
        RFC["Problem Details (RFC 7807 application/problem+json)"]
    end

    subgraph Application ["Aplicación (Zentric.Application) — Orquestación"]
        CMD["22 Commands & Handlers (Escritura CQRS)"]
        QRY["14 Queries & Handlers (Lectura CQRS)"]
        DISPATCHER["Dispatcher Nativo Desacoplado (Sin MediatR)"]
        VAL["Validación en Pipeline (FluentValidation)"]
        PORTS_IN["Puertos de Entrada (Casos de Uso)"]
    end

    subgraph Domain ["Dominio Puro (Zentric.Domain) — Centro Hexagonal"]
        AGG["10 Agregados Raíz + 1 Entidad de Auditoría"]
        VO["Value Objects Inmutables (Money, Address, Email...)"]
        RULES["18 Invariantes Estrictas de Negocio"]
        EVENTS["7 Eventos de Dominio Inmutables"]
        PORTS_OUT["11 Puertos de Repositorio + 4 Puertos de Servicio"]
    end

    subgraph Infrastructure ["Infraestructura (Zentric.Infrastructure) — Tecnología"]
        EF["Entity Framework Core 10 & PostgreSQL 16.15-alpine"]
        MODELS["14 DbSets Relacionales, DbModels y Mappers Aislados"]
        BG["Worker en Segundo Plano (CheckoutTimeoutService)"]
        UOW["Unit of Work & DomainEventDispatcher Pre-Commit"]
    end

    Presentation --> Application
    Application --> Domain
    Infrastructure --> Domain
    Infrastructure --> Application
    Presentation -.->|Registro IoC en Program.cs| Infrastructure
```

### Reglas Arquitectónicas Inviolables
1. **Aislamiento Total del Dominio:** `Zentric.Domain` no contiene dependencias de paquetes NuGet externos, frameworks web ni librerías de persistencia.
2. **Aislamiento Estricto de Persistencia:** En `Zentric.Infrastructure`, EF Core utiliza modelos dedicados (`*DbModel`) y mapeadores explícitos (`*Mapper`), previniendo anotaciones de tecnología o setters anémicos en las entidades de negocio.
3. **Controladores Delgados (Thin Controllers):** Los controladores reciben las solicitudes HTTP, resuelven la identidad del token, delegan inmediatamente en el dispatcher propio de la capa Application y devuelven respuestas RESTful consistentes.
4. **Validación Automática en Pipeline:** `ValidationBehavior` intercepta cada comando antes de alcanzar el handler, ejecutando las reglas de FluentValidation y retornando fallos tipados estructurados.

---

## 📦 Modelado Táctico de Dominio y Lenguaje Ubicuo

El modelo táctico define **10 Agregados Raíz** de negocio y **1 Entidad de Auditoría Transaccional**, asegurando que el estado interno solo mute mediante métodos expresivos:

| Agregado / Entidad | Bounded Context | Invariante Central de Negocio | Ubicación en Código |
| :--- | :--- | :--- | :--- |
| **`User`** | Usuarios e Identidad | Unicidad estricta de correo y documento. Estados: `Active`, `Blocked`. Contraseña con hash PBKDF2. | [`User.cs`](./backend/Zentric.Domain/Users/User.cs) |
| **`Buyer`** | Compradores | Identidad 1:1 con `User`. Dirección principal inmutable (`Address`) obligatoria. | [`Buyer.cs`](./backend/Zentric.Domain/Buyers/Buyer.cs) |
| **`Product`** | Catálogo | Variantes obligatorias en productos físicos. Nace publicado (`Published`). Solo el vendedor muta el estado. | [`Product.cs`](./backend/Zentric.Domain/Products/Product.cs) |
| **`Inventory`** | Inventarios | Existencias no negativas. Contadores atómicos: `AvailableQuantity`, `ReservedQuantity`, `UsedQuantity`, `DamagedQuantity`. | [`Inventory.cs`](./backend/Zentric.Domain/Inventories/Inventory.cs) |
| **`Warehouse`** | Bodegas | Capacidad volumétrica positiva ($m^3$). Tipos: bodega propia de marketplace o de vendedor. | [`Warehouse.cs`](./backend/Zentric.Domain/Warehouses/Warehouse.cs) |
| **`CustomerOrder`** | Pedidos de Compra | Carrito de compras con precio congelado por línea (`OrderItem`), cálculo aritmético en `Money` y timeout de 15 minutos. | [`CustomerOrder.cs`](./backend/Zentric.Domain/Orders/CustomerOrder.cs) |
| **`FulfillmentOrder`** | Logística y Despachos | Partición de despacho por vendedor. Ciclo: `PendingPack` → `Packed` → `Dispatched` → `Delivered` / `Cancelled`. | [`FulfillmentOrder.cs`](./backend/Zentric.Domain/Logistics/FulfillmentOrder.cs) |
| **`ReturnRequest`** | Devoluciones | Doble aprobación técnica y comercial. Reingreso obligatorio al stock usado en bodega. Prohibido para digitales. | [`ReturnRequest.cs`](./backend/Zentric.Domain/Returns/ReturnRequest.cs) |
| **`Invoice`** | Facturación | Tipos: `Master`, `ZentricDetail` (comisión interna), `VendorDetail` (liquidación de vendedor). Solo el administrador emite. | [`Invoice.cs`](./backend/Zentric.Domain/Billing/Invoice.cs) |
| **`PaymentReceipt`** | Pagos y Recaudo | Registro inmutable de transacciones de recaudo y notas crédito (`RefundCredit`) de reembolso. | [`PaymentReceipt.cs`](./backend/Zentric.Domain/Payments/PaymentReceipt.cs) |
| **`RefundAuditRecord`** | Auditoría de Reembolsos | Registro inmutable de trazabilidad para reembolsos extraordinarios ejecutados por administradores. | [`RefundAuditRecord.cs`](./backend/Zentric.Domain/Returns/Entities/RefundAuditRecord.cs) |

---

## 📑 Registro de Decisiones Arquitectónicas (ADRs)

El historial de decisiones de ingeniería se encuentra documentado bajo formato canónico en [`backendSDD/Adr/`](./backendSDD/Adr/):

| ADR | Título | Resumen de Decisión |
| :---: | :--- | :--- |
| **[ADR-0001](./backendSDD/Adr/0001-reserva-fragmentacion-contingencia.md)** | Reserva, Fraccionamiento y Contingencia | Reserva atómica en checkout; ante quiebre por stock fantasma, cancelación parcial y liberación. |
| **[ADR-0002](./backendSDD/Adr/0002-clave-inventario-variantid.md)** | Clave de Inventario por `VariantId` | El inventario se controla a nivel de SKU (`VariantId`) para existencias independientes. |
| **[ADR-0003](./backendSDD/Adr/0003-variante-obligatoria-productos-fisicos.md)** | Variante Obligatoria en Productos Físicos | Los productos físicos requieren al menos una variante con dimensiones físicas para publicarse. |
| **[ADR-0004](./backendSDD/Adr/0004-estado-cancelacion-despacho.md)** | Cancelación en Despachos Logísticos | Uso del estado `Cancelled` en `FulfillmentOrder` acompañado de motivo explícito. |
| **[ADR-0005](./backendSDD/Adr/0005-modelado-carrito-compras.md)** | Modelado de Carrito en `CustomerOrder` | El carrito se modela como el estado inicial (`Cart`) del agregado `CustomerOrder`. |
| **[ADR-0006](./backendSDD/Adr/0006-resolucion-contradiccion-ley-addendum.md)** | Prevalencia Normativa de Addenda | Aplicación estricta de la regla dictada por el Owner para partición de facturas y despachos. |
| **[ADR-0007](./backendSDD/Adr/0007-dispatcher-propio-sustituye-mediatr.md)** | Dispatcher Propio en Lugar de MediatR | Se reemplazó MediatR por un dispatcher nativo desacoplado para eliminar riesgos de licencia copyleft. |
| **[ADR-0008](./backendSDD/Adr/0008-transportadora-y-tarifa-de-envio.md)** | Política de Transportadora y Envío | Transportadora asignada por bodega y tarifa de transporte por cuenta del comprador. |
| **[ADR-0009](./backendSDD/Adr/0009-autenticacion-jwt-rg01.md)** | Autenticación Simétrica con JWT | Login con correo y contraseña, hash PBKDF2-HMAC-SHA256 en el servidor y token JWT HS256 de 60 min. |
| **[ADR-0010](./backendSDD/Adr/0010-relojo-como-puerto-iclock.md)** | Reloj como Puerto de Dominio (`IClock`) | El tiempo entra al modelo por un puerto inyectable, permitiendo congelar el tiempo en pruebas. |
| **[ADR-0011](./backendSDD/Adr/0011-matriz-autorizacion-por-rol.md)** | Matriz de Autorización por Rol | 21 políticas registradas en un archivo central con `FallbackPolicy` fail-closed. |
| **[ADR-0012](./backendSDD/Adr/0012-contrato-json-de-los-enum-por-nombre.md)** | Enumeraciones por Nombre en JSON | Los `enum` se serializan exclusivamente como texto; los enteros numéricos responden `400 Bad Request`. |
| **[ADR-0013](./backendSDD/Adr/0013-propiedad-del-recurso-por-rol.md)** | Propiedad del Recurso por Rol | El filtro por dueño lo decide el rol; un recurso ajeno responde `404 Not Found` también en escrituras. |
| **[ADR-0014](./backendSDD/Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md)** | Enmiendas a la Matriz de Roles | Quiebre reportable por Operador; facturación y reembolsos solo Administrador; Supervisor solo lectura. |
| **[ADR-0015](./backendSDD/Adr/0015-contrato-de-error-http-problem-json.md)** | Contrato de Error Problem Details | Estandarización de respuestas de error bajo RFC 7807 `application/problem+json`. |
| **[ADR-0016](./backendSDD/Adr/0016-pruebas-e2e-http-con-postgres-efimero.md)** | Pruebas E2E con PostgreSQL Efímero | Ejecución de suite de integración real contra PostgreSQL en Docker mediante Testcontainers. |
| **[ADR-0017](./backendSDD/Adr/0017-listados-de-recurso-propio.md)** | Listados de Recurso Propio | Endpoints de consulta masiva con filtrado forzado en base de datos según el rol del llamante. |
| **[ADR-0018](./backendSDD/Adr/0018-devoluciones-confianza-recepcion-responsabilidad.md)** | Protocolo de Inspección en Devoluciones | Inspección en bodega por Operador Logístico y responsabilidad económica de reembolso. |
| **[ADR-0019](./backendSDD/Adr/0019-auditoria-reembolsos-excepcionales.md)** | Auditoría de Reembolsos de Administrador | Registro inmutable de auditoría para reembolsos extraordinarios ejecutados por administradores. |
| **[ADR-0020](./backendSDD/Adr/0020-precio-congelado-y-credito-parcial-por-linea.md)** | Precio Congelado y Crédito por Línea | Snapshot inmutable del precio unitario al agregar al carrito y reembolsos proporcionales. |
| **[ADR-0021](./backendSDD/Adr/0021-ajuste-de-stock-sin-cuello-de-botella.md)** | Ajuste de Stock sin Cuello de Botella | Evidencia según tipo de bodega (Marketplace vs. Vendedor) sin cuellos de botella administrativos. |
| **[ADR-0022](./backendSDD/Adr/0022-pedido-resuelto-pasa-a-cancelled.md)** | Pedido Resuelto Transiciona a `Cancelled` | El pedido maestro pasa a Cancelled cuando todos sus despachos son cancelados por quiebre de stock. |
| **[ADR-0023](./backendSDD/Adr/0023-split-de-pagos-documentos-no-transferencias.md)** | Split Contable sin Transferencias Bancarias | El split de pagos se satisface con los 3 documentos contables sin dispersión bancaria directa. |
| **[ADR-0024](./backendSDD/Adr/0024-entrega-digital-inmediata-por-linea.md)** | Entrega Digital Inmediata por Línea | El producto digital se entrega inmediatamente tras el pago y se registra individualmente por ítem. |
| **[ADR-0025](./backendSDD/Adr/0025-stock-negativo-update-condicional-atomico.md)** | No-Negatividad de Stock con UPDATE Condicional | Garantía de existencias no negativas mediante sentencia UPDATE atómica a nivel de motor SQL. |

---

## 🔌 Contrato de API REST y Catálogo de Endpoints

La API expone **45 rutas HTTP** (44 acciones REST en 9 controladores más la sonda `/health`), detalladas en [`backendSDD/Presentation/01-endpoints.md`](./backendSDD/Presentation/01-endpoints.md):

- **Autenticación e Identidad (`AuthController`):**
  - `POST /api/auth/login` — Autenticación con correo y contraseña. Emite token Bearer JWT.
  - `GET /api/auth/me` — Consulta de identidad y rol derivada del token validado.
- **Usuarios y Acceso (`UsersController`):**
  - `POST /api/users` — Registro de usuarios (anónimo solo para rol Comprador; resto exige Administrador).
  - `GET /api/users` — Lista de usuarios con filtro opcional por rol.
  - `GET /api/users/{id}` — Ficha técnica de usuario por ID.
  - `POST /api/users/{id}/block` — Bloqueo de acceso de usuario (solo Administrador).
  - `POST /api/users/{id}/activate` — Reactivación de usuario previamente bloqueado (solo Administrador).
- **Bodegas y Almacenamiento (`WarehousesController`):**
  - `POST /api/warehouses` — Alta de bodega con capacidad volumétrica (solo Administrador).
  - `GET /api/warehouses` — Lista de bodegas activas con filtro opcional por vendedor.
  - `GET /api/warehouses/{id}` — Ficha técnica de bodega por ID.
- **Inventarios y Existencias (`InventoriesController`):**
  - `POST /api/inventories/stock` — Ingreso de unidades de stock (nuevas o usadas).
  - `GET /api/inventories` — Lista consolidada de inventario con aislamiento por rol.
  - `GET /api/inventories/{variantId}` — Consulta de stock distribuido por SKU/variante.
  - `POST /api/inventories/{id}/adjust` — Ajuste de existencias por conteo físico (solo Administrador y Supervisor).
- **Catálogo de Productos (`CatalogController`):**
  - `POST /api/catalog/products` — Alta de producto que nace publicado (`Published`).
  - `POST /api/catalog/products/{productId}/publish` — Reactivación de producto suspendido.
  - `POST /api/catalog/products/{productId}/suspend` — Suspensión temporal de producto.
  - `GET /api/catalog/products` — Catálogo público de productos disponibles.
  - `GET /api/catalog/products/paged` — Catálogo paginado con metadatos de navegación.
  - `GET /api/catalog/products/{id}` — Ficha técnica completa de un producto por ID.
- **Carrito y Pedidos (`OrdersController`):**
  - `POST /api/orders/cart` — Inicializa carrito a nombre del comprador del token.
  - `POST /api/orders/cart/items` — Agrega ítems congelando el precio unitario vigente.
  - `POST /api/orders/{orderId}/checkout` — Ejecuta checkout, reserva stock y activa ventana de 15 minutos.
  - `POST /api/orders/{orderId}/pay` — Procesa pago, consolida reserva y genera comprobante.
  - `GET /api/orders` — Lista de pedidos con aislamiento forzado en BD según rol.
  - `GET /api/orders/{id}` — Consulta de pedido (vista restringida para vendedor; completa para comprador y admin).
- **Logística y Despachos (`LogisticsController`):**
  - `POST /api/logistics/fulfillment` — Derivación de orden logística de despacho por vendedor.
  - `POST /api/logistics/fulfillment/{id}/pack` — Empaque de mercancía en bodega (`Packed`).
  - `POST /api/logistics/fulfillment/{id}/dispatch` — Despacho físico y asignación de guía (`Dispatched`).
  - `POST /api/logistics/fulfillment/{id}/deliver` — Certificación de entrega al comprador (solo Operador Logístico).
  - `POST /api/logistics/fulfillment/cancel-ghost-stock` — Cancelación por stock fantasma y devolución automática.
  - `GET /api/logistics/fulfillments` — Lista de despachos con aislamiento por rol.
  - `GET /api/logistics/fulfillment/{id}` — Consulta de despacho y número de guía de transporte.
- **Devoluciones y Garantías (`ReturnsController`):**
  - `POST /api/returns/request` — Radicación de solicitud de devolución por garantía.
  - `POST /api/returns/{id}/inspect` — Registro de dictamen de inspección física en bodega.
  - `POST /api/returns/{id}/approve` — Aprobación comercial y reingreso a stock usado (solo Vendedor).
  - `POST /api/returns/{id}/reject` — Rechazo comercial de la devolución (solo Vendedor).
  - `POST /api/returns/{id}/refund` — Emisión y liquidación del reembolso (solo Administrador).
  - `GET /api/returns` — Lista de devoluciones con aislamiento por rol.
  - `GET /api/returns/{id}` — Expediente completo de devolución por ID.
- **Facturación y Liquidación (`BillingController`):**
  - `POST /api/billing/invoices/generate/{orderId}` — Emisión de Factura Maestra y facturas split (solo Administrador).
  - `POST /api/billing/invoices/annul/{orderId}` — Anulación formal de Factura Maestra (solo Administrador).
  - `GET /api/billing/invoices` — Lista de facturas con aislamiento por rol.
  - `GET /api/billing/invoices/order/{orderId}` — Facturas vinculadas a un pedido pagado.
- **Infraestructura y Monitoreo:**
  - `GET /health` — Sonda de diagnóstico (proceso web + conectividad activa con PostgreSQL).

---

## 🔄 Flujo Operativo de Negocio

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrador
    actor Seller as Vendedor
    actor Buyer as Comprador
    actor Logistics as Operador Logístico
    participant API as API REST (Zentric.Api)
    participant App as Aplicación (CQRS)
    participant Domain as Dominio Puro
    participant DB as Base de Datos (PostgreSQL)

    Admin->>API: POST /api/users (Crear Vendedor)
    API->>App: CreateUserCommand
    App->>Domain: User.Create()
    App->>DB: Persistir UserDbModel

    Admin->>API: POST /api/warehouses (Crear Bodega)
    API->>DB: Persistir WarehouseDbModel

    Seller->>API: POST /api/catalog/products (Crear Producto Físico)
    API->>Domain: Product.Create() (Nace Published)
    Seller->>API: POST /api/inventories/stock (Ingresar Stock en Bodega)
    API->>Domain: Inventory.AddStock()

    Buyer->>API: POST /api/orders/cart (Crear Carrito con token propio)
    Buyer->>API: POST /api/orders/cart/items (Agregar Ítems con precio congelado)
    Buyer->>API: POST /api/orders/{id}/checkout (Checkout y Reserva 15 min)
    API->>Domain: CustomerOrder.Checkout() & Inventory.ReserveStock()

    Buyer->>API: POST /api/orders/{id}/pay (Confirmar Pago con Pasarela)
    API->>Domain: CustomerOrder.MarkAsPaid() & PaymentReceipt.Approve()

    Logistics->>API: POST /api/logistics/fulfillment/{id}/pack (Empacar Paquete)
    Logistics->>API: POST /api/logistics/fulfillment/{id}/dispatch (Despachar y Asignar Guía)
    Logistics->>API: POST /api/logistics/fulfillment/{id}/deliver (Certificar Entrega al Comprador)

    Admin->>API: POST /api/billing/invoices/generate/{orderId} (Emitir Factura Maestra y Split)
    API->>Domain: Invoice.CreateMaster(), Invoice.CreateVendorDetail()
```

---

## 🛡 Tratamiento Estandarizado de Errores (RFC 7807)

La API implementa respuestas estandarizadas bajo **RFC 7807 (Problem Details)** servidas con encabezado `application/problem+json`:

- Respuestas `400 Bad Request` para fallos de validación o violaciones de invariantes de negocio.
- Respuestas `404 Not Found` para identificadores inexistentes **o recursos ajenos al llamante** ([ADR-0013](./backendSDD/Adr/0013-propiedad-del-recurso-por-rol.md)).
- Respuestas `401 Unauthorized` ante tokens ausentes o inválidos.
- Respuestas `403 Forbidden` cuando el rol carece de privilegios para la política del endpoint.
- Respuestas `500 Internal Server Error` controladas por el middleware global sin exponer detalles internos de la infraestructura.

---

## 🚀 Instalación y Despliegue

### Despliegue con Docker Compose (Recomendado)
```bash
docker compose up -d --build
```
- **API REST & Swagger UI:** `http://localhost:5076/swagger`
- **Base de Datos PostgreSQL:** Puerto host `15432` (`localhost:15432`, BD: `ZentricDb`)
- **Frontend Web:** `http://localhost:5180`

Para detener el entorno conservando datos:
```bash
docker compose down
```

Para reiniciar con base de datos limpia (aplica automáticamente las 15 migraciones y el bootstrap):
```bash
docker compose down -v && docker compose up -d
```

### Ejecución Local con .NET 10 SDK
```bash
# 1. Restaurar dependencias
dotnet restore backend/Zentric.slnx

# 2. Compilar con máxima severidad
dotnet build backend/Zentric.slnx -warnaserror

# 3. Ejecutar la API
dotnet run --project backend/Zentric.Api/Zentric.Api.csproj
```

---

## 🧪 Pruebas Automatizadas y Calidad

El proyecto cuenta con **592 pruebas automatizadas** en verde continuo (100% de éxito, 0 fallos, 0 omitidas) ejecutadas con xUnit, cubriendo todas las capas arquitectónicas del backend:

```bash
# Pruebas unitarias y de arquitectura (sin Testcontainers)
dotnet test backend/Zentric.slnx --filter "FullyQualifiedName!~E2E" --no-build

# Suite completa (incluyendo E2E con PostgreSQL efímero y 8 pruebas de matriz de autorización)
dotnet test backend/Zentric.slnx
```

```text
Passed!  - Failed: 0, Passed: 592, Skipped: 0, Total: 592, Duration: 1 s - Zentric.Tests.dll (net10.0)
```

### Alcance de las Pruebas:
- **Dominio (18 Invariantes):** Reglas estrictas de negocio, aritmética decimal de precisión con `Money`, control atómico de stock (disponible, reservado, usado, dañado), máquinas de estados finitos y eventos de dominio inmutables.
- **Aplicación (CQRS):** 22 Command Handlers y 14 Query Handlers, validaciones automáticas en pipeline con FluentValidation y canalización con `ValidationBehavior`.
- **Infraestructura & Persistencia:** Mapeadores bidireccionales `*DbModel` ↔ Entidad, 14 DbSets de EF Core y transacciones con Unit of Work.
- **Seguridad y Autorización:** Matriz completa de 21 políticas de acceso verificadas automáticamente por reflexión (`EndpointAuthorizationMatrixTests`), serialización estricta de `enum` como cadenas de texto en JSON y aislamiento de datos por propiedad de recurso ([ADR-0013](./backendSDD/Adr/0013-propiedad-del-recurso-por-rol.md)).
- **Integración E2E (123 Tests):** Flujos completos HTTP con base de datos real PostgreSQL efímera instanciada en Docker mediante Testcontainers ([ADR-0016](./backendSDD/Adr/0016-pruebas-e2e-http-con-postgres-efimero.md)).

---

## 🤖 Orquestación Multi-Agente y Gobernanza SDD + ODD

Zentric cuenta con una infraestructura de orquestación determinista diseñada para ser ejecutada por cualquier modelo de IA (Claude, Gemini, GPT, DeepSeek) o CLI sin pérdida de contexto ni fatiga de tokens:

- **Prompt Orquestador Maestro:** [`.agents/orchestration/master-orchestrator.prompt.md`](./.agents/orchestration/master-orchestrator.prompt.md)
- **Máquina de Estados Unificada:** [`orchestrator-state.json`](./orchestrator-state.json)

### Flota de 13 Agentes Especializados con Contextos Acotados:
Cada agente opera exclusivamente sobre una lista blanca de archivos definida en [`.agents/orchestration/agents/`](./.agents/orchestration/agents/):

| # | Agente | Rol | Alcance de Trabajo |
|---|---|---|---|
| **00** | `coordinator` | Orquestación General | Despacho de oleadas, commits atómicos y control de `orchestrator-state.json`. |
| **12** | `sdd-alignment-auditor` | Gobernanza SDD/ODD | Auditoría spec ↔ código, activación de `/grill-me` y persistencia en Engram. |
| **01** | `domain-architect` | Dominio Backend C# | Entidades, value objects, invariantes y domain events sin dependencias. |
| **02** | `application-builder` | Casos de Uso CQRS | Comandos, consultas, validadores FluentValidation y puertos de negocio. |
| **03** | `infrastructure-adapter` | Persistencia EF Core | DbSets, DbModels, mapeadores, repositorios y migraciones PostgreSQL. |
| **04** | `api-presenter` | API REST & Seguridad | Endpoints REST, RFC 7807 (Problem Details), CORS y 21 políticas de autorización. |
| **05** | `backend-qa-guardian` | QA Backend & Cobertura | Suites xUnit, Testcontainers, BDD y compuerta de cobertura >= 90%. |
| **07** | `frontend-tokens-primitives` | Design System Base | Tokens semánticos, neutros tintados, tipografía Geist y primitivas UI atómicas. |
| **08** | `frontend-composite-ui` | Componentes Ricos | DataTables, ResponsiveDrawers, Modales, StatCards con WAI-ARIA. |
| **09** | `frontend-application-architect` | Servicios & Adaptadores | Cliente HTTP tipado, esquemas Zod, TanStack Query y SessionPort en memoria. |
| **10** | `frontend-routing-shell` | Enrutamiento & Shells | TanStack Router, guardas `beforeLoad` por rol y Shell responsivo. |
| **11** | `frontend-role-modules` | Módulos por Rol | Vistas especializadas: Buyer, Seller, Admin, Logistics, Supervisor. |
| **13** | `frontend-qa-guardian` | QA Frontend & Cobertura | Suites Vitest + React Testing Library y compuerta de cobertura >= 90%. |

### Grafo Dirigido Acíclico (DAG) por Oleadas:
```text
Oleada 0 (Secuencial): Auditoría y congelamiento de baseline documental (12-sdd-alignment-auditor).
Oleada 1 (Paralelo):   01-domain-architect (Backend) || 07-frontend-tokens-primitives (Frontend).
Oleada 2 (Paralelo):   02-application-builder + 03-infrastructure-adapter (Backend) ||
                       09-frontend-application-architect + 08-frontend-composite-ui (Frontend).
Oleada 3 (Paralelo):   04-api-presenter (Backend) || 10-frontend-routing-shell (Frontend).
Oleada 4 (Especial):   11-frontend-role-modules (Pantallas de negocio por rol).
Oleada 5 (Cierre):     05-backend-qa-guardian (xUnit >= 90%) || 13-frontend-qa-guardian (Vitest >= 90%).
```

---

## 📊 Matriz de Trazabilidad Técnica

| Componente Arquitectónico | Especificación y Requisitos | Ubicación en Código Fuente |
| :--- | :--- | :--- |
| **Metodología SDD + ODD** | Jerarquía de verdad formal, ADRs y outcomes medibles. | [`ZENTRIC.md`](./ZENTRIC.md)<br/>[`backendSDD/`](./backendSDD/)<br/>[`frontendSDD/`](./frontendSDD/) |
| **Orquestación Multi-Agente** | Flota de 13 agentes especializados y máquina de estados. | [`.agents/orchestration/`](./.agents/orchestration/)<br/>[`orchestrator-state.json`](./orchestrator-state.json) |
| **Arquitectura Hexagonal (Backend)** | Dependencia estricta hacia el centro; dominio C# puro. | [`Zentric.Domain/`](./backend/Zentric.Domain/)<br/>[`backendSDD/02-software-architecture.md`](./backendSDD/02-software-architecture.md) |
| **Modelado DDD** | 10 Agregados Raíz + 1 Auditoría con métodos semánticos. | [`Zentric.Domain/`](./backend/Zentric.Domain/)<br/>[`backendSDD/Domain/`](./backendSDD/Domain/) |
| **Aislamiento de Persistencia** | 14 DbSets, modelos `*DbModel` y `*Mapper` dedicados; Unit of Work. | [`Zentric.Infrastructure/Persistence/`](./backend/Zentric.Infrastructure/Persistence/) |
| **Segregación CQRS** | 22 Comandos y 14 Consultas con pipeline de validación nativo. | [`Zentric.Application/`](./backend/Zentric.Application/) |
| **Manejo de Errores** | Mapeo estructurado a RFC 7807 (Problem Details). | [`ApiControllerBase.cs`](./backend/Zentric.Api/Controllers/ApiControllerBase.cs)<br/>[`backendSDD/Presentation/03-error-handling.md`](./backendSDD/Presentation/03-error-handling.md) |
| **Seguridad y Autorización** | 21 Políticas fail-closed verificadas por reflexión. | [`DependencyInjection.cs`](./backend/Zentric.Api/DependencyInjection.cs) |
| **Pruebas Automatizadas (Backend)** | Suite de 592 pruebas continuas (123 E2E con Testcontainers). | [`Zentric.Tests/`](./backend/Zentric.Tests/) |
| **Arquitectura Frontend (C4)** | Monorepo Turborepo + pnpm con TanStack Router/Query. | [`frontend/`](./frontend/)<br/>[`frontendSDD/`](./frontendSDD/) |
| **Design System & Tokens** | Tokens semánticos CSS `@theme`, Geist y anti-IA genérica. | [`frontend/packages/ui/`](./frontend/packages/ui/)<br/>[`frontendSDD/Frontend-Design-System.md`](./frontendSDD/Frontend-Design-System.md) |
| **Contenerización** | Despliegue multi-servicio en Docker Compose. | [`docker-compose.yml`](./docker-compose.yml)<br/>[`backend/Dockerfile`](./backend/Dockerfile) |
| **Documentación de API** | OpenAPI v1 con Swagger UI y esquema Bearer JWT. | [`backendSDD/Presentation/01-endpoints.md`](./backendSDD/Presentation/01-endpoints.md) |
| **Decisiones Técnicas** | Registro de 25 ADRs documentados bajo formato MADR. | [`backendSDD/Adr/`](./backendSDD/Adr/) |
