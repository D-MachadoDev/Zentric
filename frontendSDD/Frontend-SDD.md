# Especificación Maestra del Frontend (Frontend SDD — Índice Canónico y Gobernanza)

> **Propósito:** Servir como documento maestro y punto de entrada único de la especificación **Spec-Driven Development (SDD)** para el frontend de **Zentric Marketplace Platform**, gobernando la arquitectura, el sistema de diseño **`hyperframes-creative`**, los contratos de integración con `.NET 10` (`45 endpoints` y `21 políticas RBAC`) y las compuertas de calidad para la flota de agentes (`07`, `08`, `09`, `10`, `11`, `12` y `13`).

---

## 1. Jerarquía Documental del Frontend SDD (`frontendSDD/`)

Ningún agente puede escribir o modificar código en `frontend/` sin consultar primero el documento normativo correspondiente de esta colección:

| # | Documento Normativo | Alcance y Contenido Principal | Agentes Consumidores Principales |
|:---:|---|---|---|
| **01** | [Frontend-SDD.md](Frontend-SDD.md) *(Este documento)* | Índice maestro, las 11 Leyes Inviolables del Frontend y la Compuerta 360° de Calidad SDD + Diseño. | Todos (`00`, `07`–`13`) |
| **02** | [Frontend-Design-System.md](Frontend-Design-System.md) | **Design Spec (`hyperframes-creative`)**: Arquitectura de profundidad en 3 capas (`#0A0E1A`, `#111827`, `#161F30`), acento único `#00D4AA`, registro tipográfico en 3 voces (`Geist Sans` + `Geist Mono tabular-nums`), diccionario de los **11 enums C#** (`domainLabels.ts`) y compuerta anti-IA genérica. | `07-frontend-tokens-primitives`, `08-frontend-composite-ui`, `11-frontend-role-modules`, `13-frontend-qa-guardian` |
| **03** | [Frontend-Architecture.md](Frontend-Architecture.md) | Arquitectura Hexagonal en el monorepo, **Mapa Anti-Amnesia de 20 Entidades/DTOs (`E-FE-001` a `E-FE-020`)** con trazabilidad `archivo:línea` a C# y contrato de 45 métodos de `ZentricApiPort`. | `09-frontend-application-architect`, `10-frontend-routing-shell`, `12-sdd-alignment-auditor` |
| **04** | [Frontend-Domain-Services.md](Frontend-Domain-Services.md) | Catálogo de **46 hooks de TanStack Query**, **12 esquemas Zod** espejo de `FluentValidation`, reglas puras de presentación y requisitos EARS (`FR-APP-01`..`ERR-APP-01`). | `09-frontend-application-architect`, `11-frontend-role-modules`, `13-frontend-qa-guardian` |
| **05** | [Frontend-Adapters.md](Frontend-Adapters.md) | Especificación de `httpClient.ts`, matriz exhaustiva de los **45 endpoints REST** por controlador C#, `memorySessionAdapter` (30 min sin refresh token) y semillas deterministas de `mockZentricApiAdapter`. | `09-frontend-application-architect`, `13-frontend-qa-guardian` |
| **06** | [Frontend-Role-Modules.md](Frontend-Role-Modules.md) | Especificación de las **27 rutas en inglés**, matriz RBAC de **21 políticas**, blueprints de composición **Split-Frame (`65% / 35%`) + Hero KPI Strip** por pantalla y reglas de negocio por rol. | `10-frontend-routing-shell`, `11-frontend-role-modules`, `13-frontend-qa-guardian` |
| **07** | [Frontend-User-Flows.md](Frontend-User-Flows.md) | Diagramas de secuencia y estado para los **7 flujos operativos end-to-end** y máquina de los 4 estados visuales (`Loading`, `Empty`, `Error`, `Populated`). | `10-frontend-routing-shell`, `11-frontend-role-modules`, `13-frontend-qa-guardian` |
| **08** | [Contract-alignment.md](Contract-alignment.md) | Certificación línea por línea (`archivo:línea`) entre `Zentric.Api` / `Zentric.Application` / `Zentric.Domain` y el frontend, documentando las 6 correcciones críticas de contrato. | `12-sdd-alignment-auditor`, `09-frontend-application-architect`, `13-frontend-qa-guardian` |
| **09** | [C4-1-Contexto.md](C4-1-Contexto.md) | Diagrama C4 Nivel 1: los 5 actores humanos (`Buyer`, `Seller`, `Administrator`, `LogisticsOperator`, `Supervisor`) y límites de privacidad PII. | Todos |
| **10** | [C4-2-Contenedores.md](C4-2-Contenedores.md) | Diagrama C4 Nivel 2: contenedores Docker/Nginx, topología Turborepo + `pnpm`, inyección runtime `/env-config.js` y alineación CORS. | `00-coordinator`, `09`, `10` |
| **11** | [C4-3-Componentes.md](C4-3-Componentes.md) | Diagrama C4 Nivel 3: descomposición interna de `apps/frontend` y `@zentric/ui` con fronteras físicas por agente para ejecución en paralelo sin colisiones. | `07`, `08`, `09`, `10`, `11` |
| **12** | [C4-4-Codigo-React.md](C4-4-Codigo-React.md) | Especificación C4 Nivel 4: jerarquía de proveedores en `main.tsx`, guardas `beforeLoad`, reglas OpenType (`tabular-nums`) y umbrales de cobertura de `13-frontend-qa-guardian`. | `07`, `08`, `09`, `10`, `11`, `13` |

---

## 2. Las 11 Leyes Inviolables del Frontend de Zentric

Todo código generado en `frontend/` debe cumplir sin excepción las siguientes 11 leyes arquitectónicas, de negocio y de diseño:

1. **Pureza SDD y Cero Sinónimos (`ZENTRIC.md` + `Engram #124`):**
   - Los nombres de tipos, propiedades, estados y roles en el código deben coincidir exactamente con el modelo de dominio en C# (`Buyer`, `Seller`, `Administrator`, `LogisticsOperator`, `Supervisor`, `CustomerOrder`, `OrderFulfillment`, `ProductInventory`, `ReturnRequest`, `Invoice`, `CommissionConfiguration`). Prohibido inventar sinónimos como `Client`, `Customer` o `Package`.
2. **Convención Bilingüe Estricta (Decisión A1):**
   - Todo el código fuente, nombres de archivos, rutas de TanStack Router (`/login`, `/register`, `/health`, `/buyer/*`, `/seller/*`, `/admin/*`, `/logistics/*`, `/supervisor/*`), identificadores y valores de enums viajan en **inglés**. Todo el texto visible por el usuario en la interfaz (etiquetas, columnas, mensajes de error RFC 7807, botones) y los comentarios del código van en **español** a través de `packages/ui/src/components/domainLabels.ts`.
3. **Sesión JWT Volátil de 30 Minutos sin Refresh Token ([ADR-0009](../backendSDD/ADR/ADR-0009-authentication-jwt-session-expiry.md)):**
   - El token emitido por `POST /api/auth/login` tiene una vida máxima de 30 minutos y se gestiona mediante `SessionPort` en memoria volátil JS con respaldo exclusivo en `sessionStorage` para soportar recargas `F5`. Queda **estrictamente prohibido** usar `localStorage`, cookies o inventar endpoints de refresh token.
4. **Registro Público Acotado y Aprovisionamiento Interno ([ADR-0022](../backendSDD/ADR/ADR-0022-public-registration-and-admin-provisioning.md)):**
   - La pantalla pública `/register` (`POST /api/auth/register`) solo permite registrar cuentas `Buyer` y `Seller`. Los roles internos (`Administrator`, `LogisticsOperator`, `Supervisor`) solo pueden ser creados por un `Administrator` autenticado desde `/admin/users` (`POST /api/users`).
5. **Reserva Atómica de 15 Minutos e Inmutabilidad Post-Pago (`ZENTRIC.md Dominio 8` + [ADR-0011](../backendSDD/ADR/ADR-0011-cart-persistence-and-checkout-clock.md)):**
   - Agregar un ítem al carrito (`POST /api/orders/cart/items`) inicia o actualiza una orden en `PendingCheckout` con reloj de reserva de 15 minutos (`checkoutExpiresAt`). La dirección de entrega y la cancelación solo están permitidas mientras el estado es `PendingCheckout` y el reloj no ha expirado. Una vez pagada (`Paid`), la orden es inmutable para el comprador.
6. **Verificación de Disponibilidad para el Comprador (`CatalogController.cs:36`):**
   - La vista de detalle de producto del comprador (`/buyer/products/$productId`) verifica disponibilidad usando exclusivamente `ProductVariantDto.canBeSold` devuelto por `GET /api/catalog/products/{id}`. Nunca debe invocar `GET /api/inventories/{variantId}` (restringido por la política `InventoryRead`).
7. **Separación de Stock Nuevo vs. Stock Usado (`ZENTRIC.md Dominio 6` + `AddStockCommand.cs`):**
   - El abastecimiento del vendedor (`POST /api/inventories/stock` con `{ variantId, warehouseId, quantity }`) incrementa únicamente el stock nuevo (`availableQuantity`). El stock usado (`usedQuantity`, `isUsed = true`) se incrementa **exclusivamente** de forma automática en el backend cuando una devolución inspeccionada como apta es aprobada (`POST /api/returns/{id}/approve`).
8. **Flujo de Devolución en 30 Días e Inspección Técnica (`ZENTRIC.md Dominio 11` + `ReturnsController.cs`):**
   - El comprador solo puede solicitar devolución dentro de los **30 días calendario** posteriores a la entrega (`Delivered`). La inspección física en bodega (`POST /api/returns/{id}/inspect` con `{ isGoodCondition }`) actualiza `ReturnRequestDto.isGoodCondition` manteniendo `status = "Requested"`, y la aprobación (`POST /api/returns/{id}/approve` con `{ returnRequestId: id }`) requiere que `isGoodCondition === true`.
9. **Alcance de Auditoría del Supervisor y Protección de PII (`UsersController.cs:19` + [ADR-0021](../backendSDD/ADR/ADR-0021-inventory-physical-count-and-ghost-stock-cancellation.md)):**
   - El rol `Supervisor` audita en modo lectura pedidos, logística, devoluciones y finanzas, y posee facultad explícita para **ajustar inventario por conteo físico** (`POST /api/inventories/{id}/adjust`). Sin embargo, tiene **prohibido el acceso a `/api/users`** (política `UserAdministration` exclusiva de `Administrator`) para proteger datos personales sensibles (`IdentityDocument`, `Email`).
10. **Aislamiento Físico del Design System (`packages/ui/src/` — Decisión A4):**
    - Para permitir ejecución concurrente sin conflictos de archivos, `07-frontend-tokens-primitives` escribe exclusivamente en `tokens/`, `primitives/`, `components/domainLabels.ts` y `logo/`, mientras que `08-frontend-composite-ui` escribe exclusivamente en `composite/`.
11. **Doctrina Visual Anti-IA Genérica (`hyperframes-creative`):**
    - Uso obligatorio de la arquitectura de profundidad en 3 capas (`#0A0E1A`, `#111827`, `#161F30`, bordes `#1F293D`), acento primario único `#00D4AA`, ámbar `#FFB800`, composición asimétrica **Split-Frame (`65% / 35%`) + Hero KPI Strip** y tipografía `Geist Mono` con `font-variant-numeric: tabular-nums` en toda cifra o código. Quedan prohibidos los textos con degradado, las barras laterales de colores en tarjetas, el negro puro `#000000` y las grillas de 4 tarjetas clonadas.

---

## 3. Compuerta 360° de Verificación SDD y Adherencia al Diseño (`QA Gate`)

Antes de que el coordinador (`00-coordinator`) marque como `completed` las oleadas de frontend en `orchestrator-state.json`, los agentes `12-sdd-alignment-auditor` y `13-frontend-qa-guardian` deben verificar con evidencia ejecutable las siguientes 5 compuertas:

| Compuerta | Comando / Verificación | Criterio de Éxito (`PASS`) |
|---|---|---|
| **G1 — Integridad de Tipos TypeScript** | `pnpm --filter @zentric/ui typecheck && pnpm --filter @zentric/frontend typecheck` | `0` errores de compilación con `strict: true` y `noUncheckedIndexedAccess: true`. |
| **G2 — Linter y Accesibilidad Estática** | `pnpm --filter @zentric/ui lint && pnpm --filter @zentric/frontend lint` | `0` errores y `0` advertencias de ESLint / `jsx-a11y` / cero usos de `any`. |
| **G3 — Cobertura de Pruebas Automatizadas** | `pnpm --filter @zentric/ui test:coverage && pnpm --filter @zentric/frontend test:coverage` | **100%** de tests en verde y cobertura de líneas y ramas $\ge 90\%$ en ambos paquetes. |
| **G4 — Alineación de Contratos Backend ↔ Frontend** | Verificación contra `Contract-alignment.md` y `Frontend-Adapters.md` | **45 métodos** en `ZentricApiPort`, **11 enums** en `domainLabels.ts` y **12 esquemas Zod** sincronizados con `Zentric.Api` y `Zentric.Application`. |
| **G5 — Adherencia Visual `hyperframes-creative`** | Inspección de estilos y tests de componentes en `@zentric/ui` y `apps/frontend` | Cero violaciones de la lista de prohibiciones visuales; presencia de `tabular-nums` en todas las columnas monetarias, de stock y relojes de cuenta regresiva. |
