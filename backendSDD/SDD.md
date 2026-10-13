# SDD — Índice Maestro del Backend

> Fuente Única de Verdad (SSoT) y catálogo de navegación de la arquitectura, especificaciones funcionales y contratos técnicos del backend de Zentric.

---

## 1. Principio Fundamental de Spec-Driven Development (SDD)

En este proyecto aplicamos **Spec-Driven Development (SDD)** bajo los siguientes principios inviolables:

1. **La jerarquía de verdad:**
   - **La Ley (`ZENTRIC.md`):** Reglas funcionales, dominios de negocio e invariantes dictadas por el cliente. Intocables por el equipo de desarrollo.
   - **Especificaciones Técnicas (`backendSDD/`):** Modelos, contratos, puertos, adaptadores y Decisiones de Arquitectura (ADRs).
   - **El Código:** Es un artefacto derivado cuya única razón de ser es satisfacer fielmente la especificación.
2. **Separación de responsabilidades:** La especificación describe **QUÉ** debe hacer el sistema y cuáles son sus invariantes, no cómo resolverlo con tutoriales de implementación.
3. **Sincronización Bidireccional:** Ninguna línea de código de negocio existe sin respaldo en esta especificación, y cualquier ajuste validado durante la implementación se refleja de inmediato en los documentos SDD.

---

## 2. Resumen Ejecutivo y Métricas Auditadas del Sistema

El sistema implementa una **Arquitectura Hexagonal (Puertos y Adaptadores)** combinada con **Domain-Driven Design (DDD)** sobre **.NET 10** y **PostgreSQL 16**:

| Dimensión | Métrica Auditada | Evidencia Técnica y Ubicación |
|---|---|---|
| **Lenguaje y Framework** | C# (.NET 10.0) | Solución ensamblada en `backend/Zentric.slnx` |
| **Motor de Persistencia** | PostgreSQL 16.15-alpine | Contenedor `zentric-postgres` en puerto `15432:5432` |
| **ORM y Mapeo** | Entity Framework Core | `ZentricDbContext` con 14 `DbSet` en `Zentric.Infrastructure` |
| **Agregados Raíz de Dominio** | 10 Agregados | `User`, `Buyer`, `Product`, `Inventory`, `Warehouse`, `CustomerOrder`, `FulfillmentOrder`, `Invoice`, `ReturnRequest`, `PaymentReceipt` |
| **Entidades de Auditoría y Control** | 1 Entidad Dedicada | `RefundAuditRecord` (control transaccional de reembolsos de administrador) |
| **Entidades Hijas y Relaciones** | 6 Modelos | `OrderItem`, `Shipment`, `ProductVariant`, `DigitalDeliveryRecord`, `RefundCredit`, `StockAdjustmentRecord` |
| **Puertos de Salida** | 11 Repositorios + 4 Servicios | Catalogados en `backendSDD/Domain/05-ports.md` |
| **Adaptadores Concretos** | 11 Repositorios + 11 Mappers | Implementados en `backend/Zentric.Infrastructure/Persistence/` |
| **Migraciones de Esquema** | 15 Migraciones | Historial canónico secuencial en `backend/Zentric.Infrastructure/Migrations/` |
| **Casos de Uso (CQRS)** | 22 Commands y 14 Queries | Desacoplados sin MediatR (Dispatcher propio) en `Zentric.Application` |
| **Validación de Entrada** | FluentValidation + Pipeline | Ejecución automática pre-handler mediante `ValidationBehavior` |
| **Endpoints HTTP REST** | 45 Endpoints | 44 acciones en controladores REST + 1 sonda de salud `/health` |
| **Políticas de Autorización** | 21 Políticas | Registradas en `AuthorizationPolicies` con política de reserva fail-closed |
| **Tratamiento de Errores** | Result Pattern + RFC 7807 | Respuestas Problem Details en `application/problem+json` |
| **Procesos en Segundo Plano** | 1 Background Worker | `CheckoutTimeoutService` (liberación de reservas a los 15 minutos) |
| **Cobertura y Calidad** | 457 Pruebas Unitarias en Verde | `dotnet test` (0 fallos, compilación con `-warnaserror`) |

---

## 3. Mapa de Navegación del Sistema

### 3.1 Documentos Normativos y Panorama Global
- **[`ZENTRIC.md`](../ZENTRIC.md):** La Ley funcional pura del cliente. Contiene las reglas generales (RG-01 a RG-11), los 11 dominios operativos y los addenda dictados por el Owner.
- **[`AGENTS.md`](../AGENTS.md):** Directrices operativas de ingeniería de software: regla de dependencia estricta, arquitectura hexagonal, Definition of Done (DoD) y políticas de calidad.
- **[`01-system-overview.md`](01-system-overview.md):** Visión global del negocio, límites del sistema y glosario de contexto delimitado.
- **[`02-software-architecture.md`](02-software-architecture.md):** Arquitectura Hexagonal, flujo unidireccional de dependencias hacia el centro y organización de proyectos.
- **[`README.md`](../README.md):** Portada técnica del repositorio, guía de ejecución en contenedores y comandos de verificación.

---

### 3.2 Capa de Dominio (`backendSDD/Domain/`)

El núcleo puro del negocio, libre de cualquier dependencia técnica o de infraestructura:

| Documento | Contenido Canónico |
|---|---|
| [`01-domain-overview.md`](Domain/01-domain-overview.md) | Panorama general del dominio, bounded contexts y fronteras transaccionales. |
| [`01-models.md`](Domain/01-models.md) | Catálogo de modelos de dominio clasificados por contexto delimitado. |
| [`02-aggregates-and-entities.md`](Domain/02-aggregates-and-entities.md) | Agregados raíz, entidades hijas y métodos de negocio expresivos (cero modelos anémicos). |
| [`02-value-objects.md`](Domain/02-value-objects.md) | Objetos de valor inmutables (`Money`, `Address`, etc.) y las 14 enumeraciones del dominio. |
| [`03-domain-services.md`](Domain/03-domain-services.md) | Servicios de dominio descentralizados para operaciones transversales. |
| [`services/inventory-reservation-service.md`](Domain/services/inventory-reservation-service.md) | Reserva atómica de inventario por mayor capacidad volumétrica disponible. |
| [`services/order-fulfillment-progress-synchronizer.md`](Domain/services/order-fulfillment-progress-synchronizer.md) | Sincronización del estado del pedido maestro a partir del avance de sus despachos. |
| [`services/returns-approval-service.md`](Domain/services/returns-approval-service.md) | Flujo de doble verificación física y comercial para devoluciones de mercancía. |
| [`services/refund-policy-service.md`](Domain/services/refund-policy-service.md) | Clasificación de reembolsos (automáticos por stock fantasma vs. excepción por daño). |
| [`04-domain-events.md`](Domain/04-domain-events.md) | Los 7 eventos de dominio inmutables, ciclo de vida y puntos de extensión. |
| [`04-invariants-and-rules.md`](Domain/04-invariants-and-rules.md) | Las 18 invariantes estrictas del modelo que garantizan la integridad en memoria. |
| [`05-ports.md`](Domain/05-ports.md) | Puertos de salida: 11 interfaces de repositorio, 4 servicios de dominio y `IUnitOfWork`. |
| [`06-business-rules.md`](Domain/06-business-rules.md) | Catálogo exhaustivo de reglas de negocio catalogadas por contexto delimitado (cero acrónimos crípticos). |
| [`07-lifecycle.md`](Domain/07-lifecycle.md) | Máquinas de estado transaccionales para pedidos, despachos, devoluciones, facturas y productos. |

---

### 3.3 Capa de Aplicación (`backendSDD/Application/`)

Orquestación de casos de uso y puertos de entrada:

| Documento | Contenido Canónico |
|---|---|
| [`01-use-cases-and-ports.md`](Application/01-use-cases-and-ports.md) | Los 22 Comandos y 14 Consultas CQRS, pipeline de validación automática con FluentValidation, consumidores de eventos y Result Pattern. |

---

### 3.4 Capa de Infraestructura (`backendSDD/Infrastructure/`)

Tecnología, persistencia física, procesos en segundo plano y empaquetado:

| Documento | Contenido Canónico |
|---|---|
| [`01-data-access.md`](Infrastructure/01-data-access.md) | Persistencia EF Core, `ZentricDbContext` con 14 DbSets, 11 repositorios concretos, 11 mappers y 15 migraciones. |
| [`02-containerization-and-deployment.md`](Infrastructure/02-containerization-and-deployment.md) | Construcción multi-etapa en Dockerfile, topología de servicios en docker-compose, ciclo de vida del esquema y bootstrap. |
| [`03-background-services.md`](Infrastructure/03-background-services.md) | Trabajador en segundo plano `CheckoutTimeoutService` para liberación de reservas vencidas a los 15 minutos. |
| [`04-entity-map.md`](Infrastructure/04-entity-map.md) | Matriz anti-amnesia de persistencia relacional que vincula cada entidad de dominio con su modelo de BD y tabla física. |

---

### 3.5 Capa de Presentación (`backendSDD/Presentation/`)

Puntos de entrada, contratos REST y seguridad perimetral:

| Documento | Contenido Canónico |
|---|---|
| [`01-endpoints.md`](Presentation/01-endpoints.md) | Catálogo canónico de los 45 endpoints HTTP expuestos por la API, esquemas OpenAPI y contratos de datos. |
| [`02-authorization.md`](Presentation/02-authorization.md) | Matriz de autorización por rol: las 21 políticas de seguridad, política de reserva fail-closed y reglas de propiedad de recurso. |
| [`03-error-handling.md`](Presentation/03-error-handling.md) | Manejo global de errores basado en RFC 7807 Problem Details y mapeo estandarizado de resultados. |

---

### 3.6 Decisiones de Arquitectura (`backendSDD/Adr/`)

Registro canónico de Decisiones de Arquitectura (ADRs) adoptadas y aprobadas:

- **[`ADR-0001`](Adr/0001-reserva-fragmentacion-contingencia.md):** Reserva de inventario en bodega única con fraccionamiento de contingencia.
- **[`ADR-0002`](Adr/0002-clave-inventario-variantid.md):** Clave canónica del inventario: `VariantId` (SKU).
- **[`ADR-0003`](Adr/0003-variante-obligatoria-productos-fisicos.md):** Obligatoriedad de variantes exclusivamente para productos físicos.
- **[`ADR-0004`](Adr/0004-estado-cancelacion-despacho.md):** Estados transaccionales de cancelación de despachos logísticos.
- **[`ADR-0005`](Adr/0005-modelado-carrito-compras.md):** Modelado del carrito de compras como estado transitorio con ventana de expiración.
- **[`ADR-0006`](Adr/0006-resolucion-contradiccion-ley-addendum.md):** Precedencia de los Addenda dictados por el Owner sobre la redacción original de la Ley.
- **[`ADR-0007`](Adr/0007-dispatcher-propio-sustituye-mediatr.md):** Dispatcher propio desacoplado para reemplazar MediatR y evitar riesgos de licenciamiento.
- **[`ADR-0008`](Adr/0008-transportadora-y-tarifa-de-envio.md):** Asignación de transportadora y cálculo de tarifas de envío.
- **[`ADR-0009`](Adr/0009-autenticacion-jwt-rg01.md):** Autenticación simétrica JWT con derivación de claves PBKDF2 en el servidor.
- **[`ADR-0010`](Adr/0010-relojo-como-puerto-iclock.md):** Abstracción del tiempo mediante el puerto de dominio `IClock`.
- **[`ADR-0011`](Adr/0011-matriz-autorizacion-por-rol.md):** Matriz centralizada de autorización por rol con política fail-closed.
- **[`ADR-0012`](Adr/0012-contrato-json-de-los-enum-por-nombre.md):** Serialización estricta de enumeraciones exclusivamente por nombre canónico en JSON.
- **[`ADR-0013`](Adr/0013-propiedad-del-recurso-por-rol.md):** Aislamiento estricto por propiedad de recurso en base de datos.
- **[`ADR-0014`](Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md):** Enmiendas operativas para cancelación por stock fantasma, emisión de facturas y rol Supervisor.
- **[`ADR-0015`](Adr/0015-contrato-de-error-http-problem-json.md):** Estandarización de errores HTTP bajo RFC 7807 `application/problem+json`.
- **[`ADR-0016`](Adr/0016-pruebas-e2e-http-con-postgres-efimero.md):** Pruebas de integración HTTP contra contenedores efímeros de PostgreSQL con Testcontainers.
- **[`ADR-0017`](Adr/0017-listados-de-recurso-propio.md):** Listados con filtrado forzado según el rol del llamante.
- **[`ADR-0018`](Adr/0018-devoluciones-confianza-recepcion-responsabilidad.md):** Protocolo de inspección física y responsabilidad económica en devoluciones.
- **[`ADR-0019`](Adr/0019-auditoria-reembolsos-excepcionales.md):** Registro inmutable de auditoría para reembolsos extraordinarios de administrador.
- **[`ADR-0020`](Adr/0020-precio-congelado-y-credito-parcial-por-linea.md):** Precio unitario congelado por línea de pedido y notas crédito proporcionales.
- **[`ADR-0021`](Adr/0021-ajuste-de-stock-sin-cuello-de-botella.md):** Ajuste de stock sin cuello de botella y evidencia según tipo de bodega.
- **[`ADR-0022`](Adr/0022-pedido-resuelto-pasa-a-cancelled.md):** El pedido totalmente resuelto pasa a estado Cancelled ante quiebre total de despachos.
- **[`ADR-0023`](Adr/0023-split-de-pagos-documentos-no-transferencias.md):** El split de pagos se cumple mediante documentos contables, no con transferencias bancarias directas.
- **[`ADR-0024`](Adr/0024-entrega-digital-inmediata-por-linea.md):** La entrega digital es inmediata tras la confirmación del pago y se registra individualmente por línea.
- **[`ADR-0025`](Adr/0025-stock-negativo-update-condicional-atomico.md):** La no-negatividad del stock se garantiza mediante UPDATE condicional atómico en base de datos.

---

## 4. Glosario Canónico del Lenguaje Ubicuo

Para garantizar el cumplimiento de la regla de **Cero Sinónimos**, todos los componentes del sistema (código, bases de datos y contratos) utilizan exclusivamente los siguientes términos:

| Término Canónico | Rol / Concepto | Definición en el Negocio |
|---|---|---|
| **Comprador** (`Buyer`) | Rol del Sistema | Persona natural o jurídica que adquiere productos. Es dueño de sus pedidos y carritos y puede solicitar devoluciones de mercancía entregada. |
| **Vendedor** (`Seller` / `Vendor`) | Rol del Sistema | Actor comercial que publica productos en el catálogo, administra sus existencias en bodega, empaca y despacha sus órdenes y aprueba devoluciones. En el token de identidad se identifica como `Seller`; en las entidades de catálogo e inventario se utiliza `VendorId`. |
| **Operador Logístico** (`LogisticsOperator`) | Rol del Sistema | Encargado del trabajo físico en bodega: recibe mercancía, empaca paquetes, registra guías de despacho, certifica entregas y dictamina inspecciones de devoluciones. |
| **Administrador** (`Administrator`) | Rol del Sistema | Encargado de la gestión de la plataforma: incorpora vendedores, habilita bodegas, emite Facturas Maestras, ejecuta reembolsos de dinero y gestiona bloqueos de usuarios. |
| **Supervisor** (`Supervisor`) | Rol del Sistema | Rol especializado de **solo lectura, auditoría y seguimiento operativo**. Participa en el ajuste de existencias por conteo físico pero carece de facultades de venta o recaudación. |
| **Pedido de Compra** (`CustomerOrder`) | Agregado de Negocio | Transacción global iniciada por un comprador que agrupa líneas de productos (pudiendo abarcar múltiples vendedores). |
| **Orden Logística de Despacho** (`FulfillmentOrder`) | Agregado de Negocio | Subdivisión operativa de un pedido correspondiente a los productos que deben ser preparados y despachados por un vendedor específico desde una bodega. |
| **Factura Maestra** (`InvoiceType.Master`) | Documento Tributario | Factura consolidada emitida al comprador por el importe total de la operación comercial. |
| **Detalle Zentric** (`InvoiceType.ZentricDetail`) | Documento Tributario | Registro interno de la comisión tecnológica correspondiente a la plataforma Zentric. Control interno confidencial. |
| **Factura de Vendedor** (`InvoiceType.VendorDetail`) | Documento Tributario | Liquidación individual emitida a cada vendedor por sus productos tras descontar la comisión de la plataforma. |
| **Solicitud de Devolución** (`ReturnRequest`) | Agregado de Negocio | Trámite radicado por el comprador para devolver mercancía física dentro del período de garantía legal. |
| **Quiebre por Stock Fantasma** | Evento Operativo | Faltante físico en bodega no reflejado en el inventario del sistema. Origina la cancelación del despacho y la devolución obligatoria con crédito al comprador. |
