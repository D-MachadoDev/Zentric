# Frontend Orchestrator State

> Estado vivo del orquestador del frontend. Forma parte del SSoT en
> [`Frontend-SDD.md`](Frontend-SDD.md); aquí se registra el detalle operativo por
> "run" (ciclo de trabajo), con evidencia y comandos. Los gates largos viven en
> [`Frontend-SDD.md` §4](Frontend-SDD.md#4-fases-y-estado).

---

## Run record (run-01: grill de diseño Q1–Q14 + actualización de specs — 2026-10-09)

- **runId:** `run-2026-10-09-frontend-grill-01`
- **fase:** cierre del grill de diseño con el Owner y re-sincronización de todo
  `frontendSDD/` antes de escribir código (**docs-first**).
- **frontend root:** `frontend/` (configuración base heredada) → objetivo
  `apps/frontend` + `packages/*` (monorepo **Q10**).
- **backend:** .NET 10, `http://localhost:5076`, **44 endpoints + `/health`**,
  580/580 tests en verde, build `0 Warning(s) 0 Error(s)`.

### Decisiones cerradas en este run (grill Q1–Q14)

| ID | Decisión | ID | Decisión |
| --- | --- | --- | --- |
| Q1 | "Sistema Operativo para Comercio" | Q8 | Geist Sans + Geist Mono; iconos Lucide |
| Q2 | Seller Dashboard + Buyer Experience | Q9 | TanStack Query |
| Q3 | Dark Developer/Builder | Q10 | Monorepo Turborepo (prioriza SEO) |
| Q4 | Vite + React 19 + TS + Tailwind | Q11 | TanStack Router |
| Q5 | shadcn/ui + Tailwind | Q12 | Access en memoria; **sin refresh** (rectificado Q15-B) |
| Q6 | Logo "Z + Órbita/Centro" | Q13 | React Hook Form + Zod |
| Q7 | Carbón `#0A0E1A` + Cian `#00D4AA` + Ámbar `#FFB800` | Q14 | shadcn/ui completo, adaptar |

### Decisiones cerradas en este run (freno de mano Q15–Q20)

| ID | Decisión | ID | Decisión |
| --- | --- | --- | --- |
| Q15 | **B — el backend manda: sin refresh** (rectifica Q12) | Q18 | **A — Tailwind v4**, tokens en CSS `@theme` |
| Q16 | **A — raíz del monorepo = `frontend/`** | Q19 | Catálogo anónimo + login al *Comprar* — **registrada y APLAZADA** (bloqueada por RG-01) |
| Q17 | **pnpm** (13.9x en caliente; bloquea dependencias fantasma) | Q20 | **Specs primero, después código** |

> **Hallazgo lateral de Q19 (Q-27 en `backendSDD/`):** el catálogo **no filtra por `Status`** y
> `AddOrderItem` **no comprueba `CanBeSold`**, contradiciendo `01-endpoints.md:238`. Reportado,
> sin corregir. Detalle en `Frontend-SDD.md` §1.4.1.

### Per-deliverable state table (specs)

| Entregable | Estado | Evidencia |
|---|---|---|
| `Frontend-SDD.md` | ✅ `UPDATED` | v1.9.0: §1.2 con Q1–Q14, §2 stack real, §4 fases, §6/§7 riesgos/bloqueos cerrados, §9 comandos pnpm |
| `Frontend-Architecture.md` | ✅ `UPDATED` | §3 monorepo Q10/Q16-A, `SessionPort` sin refresh (Q15-B), §9 stack vinculante |
| `Frontend-Design-System.md` | ✅ `REWRITTEN` | Dark builder Q3, paleta Q7, Geist Q8, Lucide, shadcn Q5/Q14, logo Z+Órbita Q6 |
| `Frontend-Adapters.md` | ✅ `UPDATED` | 44 endpoints, §4 sesión sin refresh (Q15-B, por qué no `localStorage`), alertas sin SweetAlert2 |
| `Frontend-Domain-Services.md` | ✅ `UPDATED` | login/restore reales (sin refresh), §4 formularios Zod Q13, prohibición `localStorage` |
| `Frontend-Role-Modules.md` | ✅ `UPDATED` | guardas en `beforeLoad` Q11, R-01 cerrado (20 políticas) |
| `Frontend-User-Flows.md` | ✅ `UPDATED` | regla `401` sin refresh, 2 orfandades de texto corregidas, R-03 resuelto |
| `Contract-alignment.md` | ✅ `OK` | ya en 44 endpoints; `READY_TO_START` |
| `C4-1-Contexto.md` | ✅ `NEW` | actores = 5 roles reales, JWT sin refresh, límites de confianza |
| `C4-2-Contenedores.md` | ✅ `NEW` | navegador / Nginx / API :5076, monorepo, build y arranque |
| `C4-3-Componentes.md` | ✅ `NEW` | grafo de componentes + paquetes del monorepo + reglas de dependencia |
| `C4-4-Codigo-React.md` | ✅ `NEW` | nivel código; **marcado como especificación objetivo** (el código aún no existe) |
| `frontend-orchestrator-state.md` | ✅ `NEW` | este archivo |

### Hallazgos de este run

1. **`frontend/` existe pero con stack viejo:** `package.json` trae React 18 +
   `react-router-dom` 6, y **no hay `src/`**. Choca con Q4 (React 19) y Q11
   (TanStack Router). Decisión: **reemplazar**, no migrar.
2. **Decisión Q16-A:** la raíz del monorepo es **`frontend/`** (no `zentric-frontend/`):
   conserva `docker-compose.yml` (`context: ./frontend`), el CI y el
   `Dockerfile`+`nginx` existentes, minimizando el churn.
3. El repo de referencia (`andfsanchezag/programacion_web_2026_2/frontendSDD`)
   tiene 5 documentos que aquí no existían (`C4-1..C4-4` y este archivo). Se
   reprodujeron **la estructura y el nivel de detalle**, no su dominio bancario
   ni sus roles/endpoints.
4. Ningún bloque de código quedó desbalanceado en los 13 `.md` (verificado:
   todos con número par de fences).

### Comandos ejecutados (run-01)

| Comando | Resultado |
|---|---|
| `rg -n "React 18\|SweetAlert2\|npm run..." frontendSDD/` | referencias obsoletas localizadas y corregidas |
| conteo de fences por archivo (`rg -c '^```'`) | 13/13 archivos pares |
| lectura de `AuthorizationPolicies.cs` | 20 políticas confirmadas (matriz política → roles) |
| `pnpm lint` / `pnpm typecheck` / `pnpm build` / `pnpm test` | F1: 0 errores, 43 pruebas en verde |
| `docker build ./frontend` + inspección de la imagen | artefactos servidos correctamente (F1) |
| `npx shadcn@latest add --dry-run` | 13 componentes confirmados en `packages/ui/src/components/ui/` |
| `rg -o 'var\(--[a-z0-9-]+\)' packages/ui/src/components/ui` | variables en bruto reconciliadas con los tokens `@theme` |

### Estado actual

- **F1 CERRADO: monorepo, tokens, logo y base shadcn/ui (Q14) verificados (2026-10-10).**
  `frontend/` es un monorepo Turborepo + pnpm con `apps/frontend`,
  `packages/ui` y `packages/config`.
  - **Verificado:** `pnpm lint` · `pnpm typecheck` · `pnpm build` · `pnpm test`
    (43 pruebas: 41 en `@zentric/ui` + 2 en `@zentric/frontend`) en verde.
    Geist cargado (11 `@font-face`, Inter a 0); `--color-ring` anclado a
    `--color-brand` (§5 accesibilidad).
- **Base shadcn/ui (Q14) instalada y adaptada:** 13 componentes en
  `packages/ui/src/components/ui/` + test de humo que los renderiza
  (`components.test.tsx`, 15 pruebas). Los componentes consumen los tokens
  de Zentric (Q7), no al revés.
- **4 fallos corregidos al verificar:** (1) `.gitignore` NuGet
  `**/[Pp]ackages/*` excluía `frontend/packages/` — el commit F1 no contenía
  **ningún** fichero del design system; (2) el CLI de shadcn añadía un
  `@theme inline` que anulaba Q7/Q8; (3) dependencias falsas (`cn@0.4`
  homónimo, `shadcn` como dep de ejecución, Inter); (4) Geist mal nombrado
  (`'Geist Variable'`, no `'Geist Sans Variable'`).
- **`shadcn/tailwind.css` vendorizado** (`packages/ui/src/styles/shadcn-tailwind.css`,
  MIT): la CLI arrastraba 237 dependencias por un CSS de 16 KB.
- **Bloqueadores: ninguno.**
- **Siguiente tarea por orden de dependencias:** F2 (capas: `domain`,
  `application`, `adapters`).

### Pendientes no bloqueantes

- Smoke de contraste 400/404/500 desde la UI (gate backend 6/11).
- `docker compose up` en volumen limpio (gate backend 3/10).
- `packages/api-client` (declarado en `Frontend-Architecture.md` seccion 3,
  pendiente hasta F3).

---

## Required report (run-01)

```text
Status: F1 VERIFIED (monorepo + tokens + logo + base shadcn/ui Q14)
Frontend stack: Vite + React 19 + TS + Tailwind v4 (Q4/Q18); TanStack Router (Q11)
                TanStack Query (Q9); tokens en @theme (Q7/Q8); logo SVG propio (Q6)
                Q5/Q14 shadcn/ui: 13 componentes instalados y ADAPTADOS a los tokens Q7
                Monorepo Turborepo + pnpm workspaces (Q10/Q16-A/Q17)
                Sesión (F3): access en memoria, sin refresh — Q15-B
Task selected: F1 — monorepo Turborepo + pnpm + design tokens + logo + base shadcn/ui
Files changed: frontend/.gitignore (excepcion NuGet a frontend/packages),
               frontend/package.json, pnpm-workspace.yaml, turbo.json, tsconfig.json,
               .prettierrc.json, Dockerfile, .dockerignore, README.md,
               frontend/apps/frontend/{package.json,tsconfig.json,vite.config.ts,index.html,
                 eslint.config.js,vitest.setup.ts,.env.example,components.json},
               frontend/apps/frontend/src/{main.tsx,App.test.tsx,styles/global.css,
                 lib/utils.ts,
                 app/providers/AppQueryClientProvider.tsx,app/layouts/RootLayout.tsx,
                 app/routes/{AppRouter.tsx,routerOptions.tsx,routeTree.tsx,HomePage.tsx}},
               frontend/packages/config/{package.json,tsconfig/{base,app,lib}.json,eslint/base.js},
               frontend/packages/ui/{package.json,tsconfig.json,vitest.config.ts,
                 vitest.setup.ts,eslint.config.js},
               frontend/packages/ui/src/{index.ts,tokens/{index,colors,typography,spacing}.ts,
                 tokens/tokens.test.ts,lib/{index,cn,money,dates,format}.ts,lib/*.test.ts,
                 hooks/{index,useMediaQuery,useDebounce}.ts,
                 components/logo/{Logo,LogoMark,LogoWordmark,index}.tsx|ts,Logo.test.tsx,
                 components/ui/{button,input,select,textarea,checkbox,card,table,dialog,
                   alert-dialog,alert,skeleton,label,badge}.tsx + components.test.tsx,
                 styles/{theme.css,shadcn-tailwind.css}},
               frontend/.github: .github/workflows/ci.yml migrado a pnpm
Commands: pnpm install; pnpm lint; pnpm typecheck; pnpm build; pnpm test
Build/lint/unit results: lint 0 err · typecheck 0 err · build 350.9 kB JS / 15.7 kB CSS;
          43/43 tests PASS (41 en @zentric/ui + 2 en @zentric/frontend)
          Geist verificado en bundle: 11 @font-face, Inter = 0
Endpoint coverage: 0/44 ejercitados desde el cliente (F3 pendiente)
Role modules: 0/5 implementados (F4 pendiente)
JWT/CORS: CORS PASS (política Frontend verificada); JWT PASS (ADR-0009, 60 min);
          sesión de cliente pendiente (F3)
Remaining blockers: ninguno
Next action: F2 — capas domain, application y adapters segun Frontend-Architecture.md
```

---

## Run record (run-02: F2a — capa de dominio del cliente — 2026-10-10)

- **runId:** `run-2026-10-10-frontend-f2a-domain`
- **fase:** F2a (`domain`). Transcripción del contrato verificado del backend a
  la capa de dominio del cliente, más la sincronización de specs que Q15 exige.
- **autoridad:** Q15 ("el backend manda en toda pregunta"). Cada campo se leyó
  del código real de `backend/`, nunca de la prosa de las specs.

### Qué se implementó

| Pieza | Detalle |
|---|---|
| 8 enums | Literales de texto (ADR-0012) en `src/domain/enums/`; testeado contra los valores reales |
| 11 modelos | `src/domain/models/`; transcripción campo a campo de los DTO (`Guid`→`string`, enums→uniones) |
| 3 puertos | `ZentricApiPort` (26 métodos), `SessionPort`, `AlertPort` en `src/domain/ports/` |
| `ApiError` | Traducción de `ProblemDetails` (§5) + guarda `isApiError` |

### Discrepancias spec-vs-backend resueltas por Q15 (sincronizadas en §0.2)

1. **`createProduct`** devolvía `string` en el puerto §4 y figuraba en la lista
   `readGuid` de `Frontend-Adapters` §3.1. El backend devuelve
   `CreatedProductDto` (`{ productId, variantIds }`, CAT-01). Corregido en ambas
   specs; además mitiga el riesgo FR-03 (no hace falta releer para el `variantId`).
2. **`createCart(buyerId)`** → `createCart()`: el backend no acepta cuerpo y fija
   el comprador desde el token (Q-21b).
3. **Puerto subdeclarado:** §4 listaba 18 métodos, pero los servicios de
   `Frontend-Domain-Services` §2.1–§2.7 exigen 26 (`login`, `currentUser`,
   `publishProduct`, `listInventoryByVariant`, `getInvoicesByOrder`,
   `cancelGhostStock`, `inspectReturn`, `approveReturn`). Puerto expandido.
4. **Ningún `*Input` lleva identidad del llamante** (`CallerId`, `CallerRole`,
   `BuyerId`, `vendorId` en `createProduct`): Q-21b la sobreescribe en el servidor.
5. **`ReturnStatus`**: la prosa de `Frontend-Domain-Services` §2.7 decía
   "Solicitada"; el enum real es `Requested`. Prevalece el backend.

### Evidencia (comandos)

| Comando | Resultado |
|---|---|
| `pnpm typecheck` | 0 errores (2 paquetes) |
| `pnpm lint` | 0 errores |
| `pnpm test` | 14 pruebas (12 dominio + 2 app); 41 más en `@zentric/ui` |
| `git commit` | `b092301` — 29 ficheros, +890 |
| fences `Frontend-Architecture.md` / `Frontend-Adapters.md` | 14 y 8 (ambos pares) tras la edición |

### Estado y siguiente tarea

- **F2a CERRADO: capa de dominio verificada y commiteada.**
- **Siguiente:** F2b — capa de `application` (servicios de caso de uso §2 + esquemas
  Zod §4). §4 obliga a derivar el esquema del contrato del backend "no al revés",
  lo que incluye `priceAmount` + `priceCurrency` (el ejemplo §4 abreviaba con
  `price` y omitía la moneda).

```text
Status: F2a VERIFIED (capa de dominio: enums, modelos y puertos)
Task selected: F2a — domain layer del cliente (transcripcion del contrato backend)
Files changed: frontend/apps/frontend/src/domain/{index.ts, domain.test.ts,
                 enums/{index,UserRole,OrderStatus,ProductType,ProductStatus,
                        WarehouseType,FulfillmentStatus,ReturnStatus,InvoiceType}.ts,
                 models/{index,ApiError,Health,Auth,User,Warehouse,Product,
                         Inventory,Order,Fulfillment,Return,Invoice}.ts,
                 ports/{index,ZentricApiPort,SessionPort,AlertPort}.ts},
               frontendSDD/{Frontend-Architecture.md (puerto §4), Frontend-Adapters.md (§3.1)}
Commands: pnpm typecheck; pnpm lint; pnpm test
Results: typecheck 0 err · lint 0 err · 14/14 tests PASS (12 domain + 2 app)
         commit b092301 (29 files, +890)
Endpoint coverage: 0/44 ejercitados desde el cliente (adaptador HTTP = F2c/F3)
Remaining blockers: ninguno
Next action: F2b — capa application (servicios §2 + esquemas Zod §4)
```

## Run record (run-03: F2b — capa de aplicación del cliente — 2026-10-10)

- **runId:** `run-2026-10-10-frontend-f2b-application`
- **fase:** F2b (`application`). Casos de uso, esquemas de formulario y reglas
  de presentación, orquestando los puertos de F2a.
- **autoridad:** `backendSDD/` (Q15). Toda regla de negocio que el cliente
  replica se verificó contra el backend antes de escribirla.

### Qué se implementó

| Pieza | Detalle |
|---|---|
| 26 casos de uso | `src/application/services/`, un fichero por contexto (`identity`, `catalog`, `inventory`, `orders`, `billing`, `logistics`, `returns`, `transversal`); clases con inyección por constructor y método `ejecutar` |
| `ProductoRegistrado` | `src/application/dto/`; `variantId` y `sku` anulables (un producto `Digital` puede nacer sin variantes, ADR-0003) |
| 7 esquemas Zod | `src/application/schemas/` (Q13); anclados al `*Input` del puerto con `z.ZodType<T, T>` |
| Reglas de presentación | `src/domain/rules/`: `esPedidoModificable`, `admiteDevolucion` |

### Reglas verificadas contra `backendSDD/`

1. **`esPedidoModificable`** — `Domain/07-lifecycle.md` confirma que sólo `Cart` y
   `PendingPayment` transicionan: *"Paid, Dispatched y Delivered no admiten
   cancelación"*. Un pedido Pagado o posterior es de sólo lectura.
2. **`admiteDevolucion`** — sólo `Physical` (ADDENDUM Dominio 10).
3. **Ningún caso de uso lleva identidad en la llamada** (Q-21b, ADR-0013):
   `createCart()` no recibe argumentos y `RegistrarUsuarioService` no envía
   `CallerId`/`CallerRole`.
4. **`RegistrarProductoService`** usa el `variantIds` del propio alta (CAT-01,
   mitiga FR-03) y sólo relée para recuperar el `sku`, que el alta no devuelve.

### Discrepancias resueltas (sincronizadas en specs, §0.2)

1. **Puerto subdeclarado:** `ZentricApiPort.listProducts()` no exponía el
   `vendorId` opcional, pero `GET /api/catalog/products?vendorId=` sí lo acepta
   y §2.2 lo exige ("filtra por vendedor si se indica"). Puerto y
   `Frontend-Architecture` §4 corregidos.
2. **Árbol incompleto:** `Frontend-Architecture` §3 no declaraba `domain/rules/`,
   pese a que `C4-4` ubica las reglas de presentación en el dominio.

### Defecto residual de F1 corregido

`apps/frontend/package.json` seguía arrastrando `cn@0.4.0` — el compilador de
COBOL homónimo, **no** la utilidad `cn()`, que vive en `packages/ui/src/lib/cn.ts`
y se re-exporta desde `apps/frontend/src/lib/utils.ts`. Verificado con
búsqueda: **ningún fichero importa el paquete npm**. F1 lo limpió de
`packages/ui` y dejó éste. Añadido `zod@4.6.5` pineado (convención del monorepo).

### Evidencia (comandos)

| Comando | Resultado |
|---|---|
| `pnpm --filter @zentric/frontend typecheck` | 0 errores |
| `pnpm --filter @zentric/frontend lint` | 0 errores |
| `pnpm test` | 74 pruebas (41 `@zentric/ui` + 33 app) · 2 tareas turbo |
| `git commit` | `2b02a9e` — 23 ficheros, +842/−17 |
| fences `Frontend-Architecture.md` / `Frontend-SDD.md` | 14 y 2 (ambos pares) tras la edición |

### Estado y siguiente tarea

- **F2b CERRADO: capa de aplicación verificada y commiteada.**
- **Siguiente:** F2c/F3 — adaptador HTTP + sesión (`adapters/`). Implementa los 26
  métodos de `ZentricApiPort`, `SessionPort` en memoria sólo (Q15-B/ADR-0009),
  mapeo `ProblemDetails`→`ApiError` (§5) y la lista `readGuid` de `Frontend-Adapters`
  §3.1 (`createUser`, `createWarehouse`, `addStock`, `createCart`,
  `createFulfillment`, `requestReturn` — **no** `createProduct`).

```text
Status: F2b VERIFIED (capa de aplicacion: casos de uso, esquemas y reglas)
Task selected: F2b — application layer del cliente
Files changed: frontend/apps/frontend/src/application/{index.ts,
                 dto/index.ts,
                 schemas/{index,schemas.test}.ts,
                 services/{index,identity,catalog,inventory,orders,billing,
                           logistics,returns,transversal,services.test}.ts},
               frontend/apps/frontend/src/domain/{index.ts,rules/{index,
                 presentation,presentation.test}.ts,ports/ZentricApiPort.ts},
               frontend/apps/frontend/package.json (+zod@4.6.5, -cn@0.4.0),
               frontendSDD/{Frontend-Architecture.md,Frontend-SDD.md}
Commands: pnpm typecheck; pnpm lint; pnpm test
Results: typecheck 0 err · lint 0 err · 74/74 tests PASS (41 ui + 33 app)
         commit 2b02a9e (23 files, +842/−17)
Endpoint coverage: 0/44 ejercitados desde el cliente (adaptador HTTP = F2c/F3)
Remaining blockers: ninguno
Next action: F2c/F3 — adaptador HTTP + sesion en memoria (26 metodos, Q15-B)
```

## Run record (run-04: F2c/F3 — adaptador HTTP y sesión — 2026-10-10)

- **runId:** `run-2026-10-10-frontend-f2c-adapters`
- **fase:** F2c/F3 (`adapters/`). Único punto de contacto con la red y sesión
  en memoria, implementando los puertos de F2a.
- **autoridad:** `Frontend-Adapters.md` §1–§4, con cada regla de comportamiento
  del backend verificada en `backendSDD/` antes de codificarla.

### Qué se implementó

| Pieza | Detalle |
|---|---|
| `ZentricHttpClient` | Los 26 métodos de `ZentricApiPort`; rutas del §2, cabeceras de §1 |
| `toApiError` | `ProblemDetails`→`ApiError` cubriendo **ambos** envoltorios (§3.4) |
| `readGuid` | §3.1 en los seis endpoints de creación |
| `InMemorySession` | Token sólo en memoria, sin refresh (§4 / ADR-0009) |
| `createApiClient()` | Compone sesión y cliente para romper el ciclo mutuo |

### Decisiones verificadas contra `backendSDD/`

1. **`approveReturn` lleva el id también en el cuerpo.** `01-endpoints.md:277`
   describe `ApproveReturnCommand (Body: solo ReturnRequestId)` junto al `id` de
   ruta. El adaptador los deriva del mismo argumento, así que **coinciden por
   construcción** y no puede haber una petición incoherente.
2. **`createProduct` no pasa por `readGuid`**: devuelve `CreatedProduct`
   (`{ productId, variantIds }`, CAT-01), no un Guid crudo.
3. **`login` y `health` van sin `Authorization`** aunque hubiese token viejo en
   memoria (§1).
4. **`restore()` no prolonga la vida del token**: lee los claims del vigente (§4).

### Comportamiento del cliente (§1, decidido en la spec)

- 15 s de tiempo máximo con `AbortSignal.timeout`.
- **Un** reintento ante `5xx` o error de red, **nunca** ante `4xx`. Un `5xx`
  transitorio se recupera; un segundo fallo propaga `ApiError`.
- Error de red o timeout → `ApiError` con **estado 0**, que la presentación
  distingue de un error HTTP para ofrecer reintento (§5).
- `ApiError.detail` sigue el orden `detail` → `title` → `errors` aplanado →
  genérico, y conserva `traceId` para soporte (R-05 pendiente de migrar a 9457).

### Evidencia (comandos)

| Comando | Resultado |
|---|---|
| `pnpm --filter @zentric/frontend typecheck` | 0 errores |
| `pnpm --filter @zentric/frontend lint` | 0 errores |
| `pnpm test` | 98 pruebas (41 `@zentric/ui` + 57 app) · 2 tareas turbo |
| `git commit` | `da735e9` — 8 ficheros, +773/−3 |

### Estado y siguiente tarea

- **F2 CERRADO (F2a + F2b + F2c) y F3 CERRADO: las tres capas del cliente están
  implementadas y verificadas.**
- **Siguiente:** F4 — módulos por rol (`Frontend-Role-Modules.md`), montando
  rutas con TanStack Router (Q11), TanStack Query (Q9) y los componentes de
  `@zentric/ui` (Q5/Q14).

```text
Status: F2c/F3 VERIFIED (adaptador HTTP + sesion en memoria)
Task selected: F2c/F3 — adapters del cliente
Files changed: frontend/apps/frontend/src/adapters/{index.ts,
                 http/{ZentricHttpClient,problemDetails}.ts,
                 http/__tests__/{ZentricHttpClient,problemDetails}.test.ts,
                 session/InMemorySession.ts,
                 session/__tests__/InMemorySession.test.ts},
               frontendSDD/Frontend-SDD.md
Commands: pnpm typecheck; pnpm lint; pnpm test
Results: typecheck 0 err · lint 0 err · 98/98 tests PASS (41 ui + 57 app)
         commit da735e9 (8 files, +773/−3)
Endpoint coverage: 26/26 métodos del puerto implementados; 0 ejercitados contra
                   el backend real (requiere el API en marcha)
Remaining blockers: ninguno
Next action: F4 — modulos por rol (TanStack Router + Query + @zentric/ui)
```

## Run record (run-05: verificación end-to-end contra el backend real — 2026-10-10)

- **runId:** `run-2026-10-10-frontend-live-verification`
- **fase:** verificación de F2c/F3. Sustituye el `fetch` falso por el backend
  real para ejercitar rutas, desenvolvimiento de respuestas y formato de error.
- **autoridad:** `docker compose` con **volumen limpio** + `backendSDD/`.

### Infraestructura levantada

| Pieza | Detalle |
|---|---|
| `db` | `postgres:16.15-alpine`, volumen nuevo `zentric_pgdata` |
| `api` | imagen `zentric:latest` construida del `backend/Dockerfile`, healthy en 5076 |
| Puerto 5432 | ocupado en el host por otro PostgreSQL (PID 7980); `db` se remapeó a **15432** con un override temporal **fuera del repo** |

### Tres errores de contrato que sólo se veían en ejecución

1. **`checkout`, `pay` y `dispatch` devuelven `200 OK` sin cuerpo.** Los
   controladores hacen `return Ok();`. El puerto y los servicios prometían
   `Promise<boolean>`, así que el adaptador devolvía `undefined` — un falso
   positivo que habría hecho creer a la UI que el pago falló. Pasan a `void`
   (nueva §3.5 de `Frontend-Adapters`).
2. **Faltaba `packFulfillment`.** El despacho nace en `PendingPack` y
   `07-lifecycle.md` dice *"Dispatch sin haber empaquetado lanza excepción"*.
   Sin `pack` la UI **nunca** habría podido despachar: el fallo real fue
   `HTTP 400 — Order must be packed before being dispatched.`
3. **Faltaba `deliverFulfillment`.** Es el cierre que sólo puede hacer el
   Operador Logístico (Q-23). El enum `FulfillmentStatus` del cliente ya
   modelaba `PendingPack | Packed | Dispatched | Delivered | Cancelled`, pero
   no había método para transitarlo: **el modelo estaba bien y el puerto no.**

### Otro hallazgo de comportamiento

El alta de producto deja el producto **ya `Published`**; volver a publicarlo
responde `HTTP 400 — Product is already published.` La verificación lo fija
para que F4 no diseñe una pantalla de "publicar" sobre un estado que no existe.

### Evidencia (comandos)

| Comando | Resultado |
|---|---|
| `docker compose up -d --build db api` | volumen limpio; ambos healthy |
| `POST /api/auth/login` + `GET /api/auth/me` | formas reales **idénticas** a `AuthToken` y `CurrentUser` |
| `vitest run againstLiveBackend.integration.test.ts` | **24/24** tras las correcciones |
| `pnpm test` | 122 pruebas (41 `@zentric/ui` + 81 app) |
| `git commit` | `c36c4f7` — 9 ficheros, +441/−28 |

### Estado y siguiente tarea

- **F2 y F3 cerrados y verificados contra el backend real.** El puerto pasa de
  **26 a 28 métodos**; nuevos servicios `EmpacarService` y `EntregarService`.
- **Siguiente:** F4 — módulos por rol (`Frontend-Role-Modules.md`).
- **Pendiente no bloqueante:** levantar el stack otra vez cuando se quiera
  revalidar; los contenedores siguen en marcha.

```text
Status: F2c/F3 VERIFIED contra el backend real (24 pruebas end-to-end)
Task selected: verificacion end-to-end del adaptador
Files changed: frontend/apps/frontend/src/domain/ports/ZentricApiPort.ts
               (+packFulfillment, +deliverFulfillment; checkout/pay/dispatch
                pasan a Promise<void>),
               frontend/apps/frontend/src/adapters/http/ZentricHttpClient.ts,
               frontend/apps/frontend/src/application/services/{orders,logistics}.ts,
               frontend/apps/frontend/src/adapters/http/__tests__/
                 againstLiveBackend.integration.test.ts,
               frontendSDD/{Frontend-Architecture.md (puerto),
                 Frontend-Adapters.md (tabla §2 + §3.5),
                 Frontend-Domain-Services.md (§2.4/§2.6), Frontend-SDD.md}
Commands: docker compose up -d --build db api; pnpm typecheck; pnpm lint; pnpm test
Results: typecheck 0 err · lint 0 err · 122/122 tests PASS (41 ui + 81 app)
         24 de ellas end-to-end contra http://localhost:5076
         commit c36c4f7 (9 files, +441/−28)
Endpoint coverage: 28/28 métodos del puerto ejercitados contra el backend real
Remaining blockers: ninguno
Next action: F4 — modulos por rol (TanStack Router + Query + @zentric/ui)
```

---

## Run record (run-06: F4a — módulo público y guardas de rol — 2026-10-10)

### Decisión del Owner en este run

Antes de escribir código apareció una ambigüedad que bloqueaba los cuatro
módulos a la vez, y se aplicó el freno de mano: **las tablas de §2.2, §2.4,
§2.5 y la del Vendedor declaraban cuatro veces la ruta `/`**, y TanStack Router
no admite cuatro componentes en la misma ruta. (El resto **no** colisionaba:
`/pedidos/:id` de §2.4 y §2.6 es *la misma* ruta —detalle con pago sólo para el
Comprador—, y `/usuarios`, `/catalogo`, `/despachos/:id` son disjuntas.)

**Decidido:** `/` **despacha por rol**. Renderiza el panel del rol activo según
`session.getRole()`, sin tocar las specs. La alternativa descartada fue prefijar
los paneles (`/admin`, `/vendedor`, …), que habría obligado a reescribir
§2.2–§2.5 y todas sus subrutas.

### Qué se implementó

- **`modules/public/`** — §2.1, la única puerta de entrada al sistema:
  `/entrar` (login con correo y contraseña, ADR-0009, **no** selector de rol) y
  `/salud` (diagnóstico público). Formulario con React Hook Form + Zod (Q13),
  `pending` que bloquea envíos duplicados y desactiva campos, y conservación de
  lo escrito ante un fallo (§5 `400`).
- **Guardas de §3** en `app/routes/guards.ts`: sin sesión → redirige a
  `/entrar?aviso=sin-sesion`; con el rol equivocado → `RolNoAutorizadoError` que
  `defaultErrorComponent` convierte en un `403` que **conserva la sesión**.
- **`AuthProvider` / `useAuth()`** de C4-4 §3, con la restauración de
  `GET /api/auth/me` al montar sólo si queda token en memoria.
- **`IniciarSesionSchema`**, el octavo esquema, anclado al `LoginInput` del
  puerto como los siete anteriores.

### Hallazgos (corregidos en código y specs)

1. **El adaptador ignoraba el `401`.** §4/§5 exigen que un `401` limpie la
   sesión. Se añade, **sólo a quien llevaba token**: un `401` de un `login`
   fallido no es una sesión que se haya perdido, son credenciales que no valían.
   Queda pendiente para F5 la mitad automática —*volver a la entrada con aviso*—,
   que necesita que la interfaz se entere del cambio de sesión.
2. **El tema declaraba `--color-warning`/`--color-info`/`--color-success`
   (Q7/Q8) pero ningún componente los expresaba.** F4 necesita estados
   semánticos en todos los módulos (pedido, despacho, devolución, publicación),
   y sin ellos todo acabaría en `secondary`. Añadidas las variantes a `Badge` y
   `Alert`; se mantiene la regla de `StatusBadge`: el color nunca es el único
   indicador.
3. **§2 de `Frontend-Architecture` no permitía a `modules/` importar
   `app/providers`**, contradiciendo el arco `modules → providers` del diagrama
   de C4-3 y el `useAuth()` que C4-4 §3 prescribe desde páginas, layouts y
   guardas. Resuelto citando ambos documentos: `app/providers` queda como única
   excepción permitida, el resto de `app/` sigue sin ser importable.
4. **La tabla de rutas del Vendedor estaba huérfana tras §5** mientras §2.3
   seguía diciendo *"Estado: sin diseñar"* — se reincorpora a §2.3. Y la tabla
   de §2.1 describía `/entrar` como *"Selección de rol de trabajo"* pese al
   ADDENDUM de abajo que lo corrigió.
5. **Q13 exigía React Hook Form + Zod pero la dependencia nunca se había
   instalado**: no existía ningún formulario antes de F4, así que nadie la
   había necesitado.
6. **Árbol de §3 desalineado con el código**: declaraba `src/layouts/` y el
   código tenía `src/app/layouts/`; además existía `src/lib/utils.ts`, un
   re-export muerto de `cn()` sin importadores y fuera del árbol.

### Evidencia (comandos)

```text
pnpm typecheck  -> 0 errores
pnpm lint       -> 0 errores, 0 avisos
pnpm test       -> 142/142 (41 @zentric/ui + 101 app)
                  24 de ellas end-to-end contra http://localhost:5076 (siguen en verde)
Navegador real  -> http://localhost:5173/entrar: formulario completo, acceso con
                  admin@zentric.local contra el backend vivo y navegación a /;
                  recargar la página pierde la sesión (contrato Q15-B, no un fallo)
```

### Estado y siguiente tarea

- **F4a cerrado.** `modules/public/` y las guardas de §3 implementadas y
  verificadas.
- **Siguiente:** F4b — `modules/admin/` (§2.2), el módulo mejor especificado, y
  con él `/` pasa a ser el despachador por rol.
- **Pendiente no bloqueante:** `adapters/alert` sigue sin implementarse
  (`AlertPort` existe en `domain/ports`); F4 lo necesita para las confirmaciones
  destructivas.

```text
Status: F4a VERIFIED (guardas + modulo publico, 142 tests)
Task selected: modulo publico y guardas de rol
Files changed: frontend/apps/frontend/src/modules/public/{EntrarPage,SaludPage,index}.tsx,
               frontend/apps/frontend/src/modules/public/__tests__/publicModule.test.tsx,
               frontend/apps/frontend/src/app/routes/{routeTree,routerOptions,guards,
                 routerContext,RouteErrorComponent}.tsx,
               frontend/apps/frontend/src/app/routes/__tests__/guards.test.tsx,
               frontend/apps/frontend/src/app/providers/{AuthProvider,authContext,
                 appServices}.tsx,
               frontend/apps/frontend/src/components/{errorMessage.ts,__tests__/},
               frontend/apps/frontend/src/layouts/RootLayout.tsx (movido de app/layouts),
               frontend/apps/frontend/src/main.tsx,
               frontend/apps/frontend/src/application/schemas/index.ts (+IniciarSesionSchema),
               frontend/apps/frontend/src/adapters/http/ZentricHttpClient.ts (401 limpia sesion),
               frontend/packages/ui/src/components/ui/{badge,alert}.tsx (estados semanticos),
               frontendSDD/{Frontend-Architecture.md, Frontend-Design-System.md,
                 Frontend-Role-Modules.md, Frontend-SDD.md (v1.19.0)}
Commands: pnpm typecheck; pnpm lint; pnpm test
Results: typecheck 0 err · lint 0 err · 142/142 tests PASS
Remaining blockers: ninguno
Next action: F4b — modules/admin/ (Frontend-Role-Modules.md §2.2)
```

## Run record (run-07: F4b — módulo del Administrador — 2026-10-11)

- **runId:** `run-2026-10-11-frontend-f4b-admin`
- **fase:** F4b (`modules/admin/`, consola autenticada, `/` despacha por rol).
- **autoridad:** `Frontend-Role-Modules` §2.2 y §3–§4, `Frontend-Design-System`
  §3–§4, `Frontend-Adapters` §5; cada regla de negocio verificada contra
  `backendSDD/` y `ZENTRIC.md` antes de escribirla.

### Qué se implementó

| Pieza | Detalle |
|---|---|
| `_console` | Ruta sin `path` cuyo `beforeLoad` exige sesión y cuyo componente es `ConsoleLayout`; la sesión se pide **una sola vez** |
| `/` | `PanelSegunRol` despacha por rol (F4-Q1); sólo el Administrador tiene panel en esta fase |
| §2.2 usuarios | `UsuariosPage` (tabla con rol rotulado y estado) y `NuevoUsuarioPage` (RHF + Zod, panel de éxito con el identificador y enlace al alta de su bodega cuando el rol es Vendedor) |
| §2.2 bodegas | `BodegasPage` y `NuevaBodegaPage` (el dueño sólo existe para una bodega de vendedor) |
| §2.2 devoluciones | `DevolucionesPage`: bandeja con `StatusBadge` y reembolso **sólo** sobre lo aprobado, con confirmación que nombra el pedido |
| §2.2 facturación | `FacturarPage` (`/pedidos/$id/facturar`): muestra el split ya emitido y deshabilita la emisión |
| `components/domainLabels.ts` | Rótulos de `UserRole`, `ReturnStatus`, `WarehouseType` e `InvoiceType` como `Record<Enum, string>` exhaustivo + tonos de la insignia |
| `layouts/` | `navigation.ts` (listado único filtrado por rol, literales `as const satisfies`) y `ConsoleLayout` (armazón y cierre de sesión) |

### Cómo se evitó inventar (freno de mano aplicado al vuelo)

1. **Reembolso, no aprobación.** `POST /api/Returns/{id}/approve` es del Vendedor
   y responde `403` al Administrador (`ADR-0006`, Q-24); el poder de este rol es
   `refundReturn`. La spec de §2.2 ya decía "(reembolso)".
2. **La emisión de facturas no pide confirmación.** `Frontend-User-Flows` la pide
   para *Finalizar compra* y *Pagar*, y **no** para emitir; `Frontend-Adapters` §5
   la reserva a acciones financieras o destructivas. Además el backend rechaza un
   pedido ya facturado con `400`, así que la página muestra las facturas y
   deshabilita el botón en vez de ofrecer una acción condenada.
3. **Alta de Vendedor → alta de su bodega** con el identificador a la vista:
   `ZENTRIC.md` §6.1 ("el Administrador registra al vendedor y su primera bodega").
   El `Guid` creado es el `vendorId` que pedirá la bodega.
4. **Sin enlaces muertos.** Catálogo, Productos, Inventario, Carrito y Despachos
   de §4 no se listan porque sus módulos aún no existen, y `to` es literal para
   que `<Link>` lo verifique al compilar.
5. **Rótulos fuera de los módulos.** `modules/` no importa `domain/`
   (`Frontend-Architecture` §2), así que la traducción de enums vive en
   `components/`, la capa puente que también aloja `errorMessage.ts`.

### Hallazgos (corregidos en código)

1. **`StatusBadge` no compilaba al ser alcanzable desde la app.** El tipo de
   `cva` admite `tone = null` y se indexaba un `Record` sin esa clave; hasta ahora
   ningún fichero de `apps/frontend` importaba el componente, así que `tsc` no lo
   había revisado. Se normaliza el tono.
2. **`AdminPanelPage` ofrecía un enlace muerto** a `/productos/nuevo`, ruta del
   Vendedor que llega con F4c; además el vacío no pintaba su acción.
3. **El `.refine` de `RegistrarBodegaSchema` no anclaba el error** a `vendorId`,
   de modo que el formulario nunca mostraba el aviso de correspondencia
   tipo↔dueño. `path: ['vendorId']`.
4. **`select` de Radix no se puede operar en jsdom sin stubs.** Añadidos
   `ResizeObserver`, captura de puntero y `scrollIntoView` en `vitest.setup.ts`,
   y `@testing-library/user-event` como dependencia de desarrollo.

### Discrepancia reportada, no resuelta (no bloqueante)

`Frontend-Architecture` §2 **no lista `domain/`** entre lo que puede importar
`modules/`, pero F4d (Comprador) necesitará las reglas de presentación
`esPedidoModificable` y `admiteDevolucion`, que viven en `domain/rules/`. F4b se
ha diseñado **sin** importar `domain/` (tipos por inferencia de los servicios y
rótulos en `components/`), pero la pregunta sigue abierta para el Owner: ¿pueden
los módulos importar `domain/` **tipos** (y reglas de presentación), o todo debe
pasar por `components/`?

### Evidencia (comandos)

```text
pnpm typecheck  -> 0 errores (turbo, 2 paquetes)
pnpm lint       -> 0 errores, 0 avisos
pnpm test       -> 183/183 (47 @zentric/ui + 136 app)
                   136 app incluyen 24 end-to-end contra http://localhost:5076
Navegador real  -> http://127.0.0.1:5173 (el 5173 de localhost lo ocupa otro
                   proyecto; el origen se habilitó SOLO en el contenedor, con un
                   override temporal fuera del repo y restaurado después):
                   acceso admin@zentric.local, / con datos reales (34 usuarios,
                   11 bodegas, 11 productos, servidor operativo), /usuarios con
                   roles rotulados, /bodegas con capacidad formateada,
                   /devoluciones con la insignia de estado y el boton Reembolsar
                   solo en las aprobadas, dialogo de confirmacion cancelado sin
                   mover dinero, POST /api/Returns/{id}/refund -> 200 sin cuerpo
                   y estado Refunded, y /pedidos/<id>/facturar con el split ya
                   emitido y la emision deshabilitada
```

### Estado y siguiente tarea

- **F4b cerrado.** `modules/admin/` implementado, probado y verificado en vivo.
- **Siguiente:** F4c — `modules/seller/` (§2.3): catálogo propio con `Suspended`
  y `Discontinued`, alta de producto, publicación y carga de existencias. Es la
  primera fase que necesitará `domain/rules` (`esPedidoModificable` no; sí
  `admiteDevolucion` en F4d), así que arrastra la pregunta abierta de arriba.
- **Pendiente no bloqueante:** Q-28 (catálogo público / SEO) sigue aplazado por el
  Owner y no bloquea ninguna fase.

```text
Status: F4b VERIFIED (modulo admin, 183 tests, verificado en vivo)
Task selected: modules/admin/ (Frontend-Role-Modules.md seccion 2.2)
Files changed: frontend/apps/frontend/src/modules/admin/{AdminPanelPage,
                 UsuariosPage,NuevoUsuarioPage,BodegasPage,NuevaBodegaPage,
                 DevolucionesPage,FacturarPage,__tests__/adminModule.test}.tsx,
               frontend/apps/frontend/src/components/{domainLabels.ts,
                 __tests__/domainLabels.test.ts},
               frontend/apps/frontend/src/layouts/{navigation.ts,ConsoleLayout.tsx},
               frontend/apps/frontend/src/app/routes/{routeTree.tsx,
                 PanelSegunRol.tsx} (borrado HomePage.tsx),
               frontend/apps/frontend/src/application/schemas/index.ts (refine path),
               frontend/apps/frontend/src/App.test.tsx,
               frontend/apps/frontend/vitest.setup.ts,
               frontend/apps/frontend/package.json (+@testing-library/user-event),
               frontend/packages/ui/src/components/ui/status-badge.tsx,
               frontendSDD/{Frontend-Design-System.md, Frontend-Role-Modules.md,
                 Frontend-Adapters.md, Frontend-SDD.md (v1.20.0)}
Commands: pnpm typecheck; pnpm lint; pnpm test; navegador real (chrome-devtools MCP)
Results: typecheck 0 err - lint 0 err - 183/183 tests PASS - recorrido en vivo OK
Remaining blockers: ninguno (Q-28 aplazado por el Owner, no bloqueante)
Next action: F4c - modules/seller/ (Frontend-Role-Modules.md seccion 2.3)
```

## Run record (run-08: F4c — módulo del Vendedor — 2026-10-12)

- **runId:** `run-2026-10-12-frontend-f4c-seller`
- **fase:** F4c (`modules/seller/`, catálogo propio, alta, publicación/suspensión, carga de inventario).
- **autoridad:** `Frontend-Role-Modules` §2.3 y §4, `Frontend-Design-System` §3–§4,
  `Frontend-Adapters` §5; reglas de negocio verificadas contra `backendSDD/` y `ZENTRIC.md`.

### Qué se implementó

| Pieza | Detalle |
|---|---|
| `PanelVendedorPage` | Vista de catálogo propio filtrado por `vendorId` (Q-27), tabla de productos con estado y acciones rápidas |
| `NuevoProductoPage` | Alta de producto con variantes obligatorias para productos físicos (CAT-03 / ADR-0003), RHF + Zod |
| `ProductoPage` | Ficha de detalle, alternancia entre publicar (`/publish`) y suspender (`/suspend`), visualización de `variantId` y SKU |
| `InventarioPage` | Carga de stock a bodega con cantidad estrictamente positiva (INV-01) y listado de existencias |
| `TableSkeleton` | Componente reutilizable para estados de carga tabular en `components/` (reemplaza duplicaciones en admin) |
| `domainLabels.ts` | Rótulos exhaustivos y tonos semánticos para `ProductStatus` y `ProductType` |
| `navigation.ts` | Enlaces del Vendedor (Panel, Productos, Inventario) activos según la matriz de permisos RG-03 |
| `PanelSegunRol` | Despacho automático de la raíz `/` hacia `PanelVendedorPage` al iniciar sesión como `Seller` |

### Evidencia (comandos)

```text
pnpm typecheck  -> 0 errores
pnpm lint       -> 0 errores
pnpm test       -> 195/195 tests PASS (47 @zentric/ui + 148 app, incluyendo 24 e2e contra backend real y 7 de seller)
pnpm build      -> build exitoso de toda la solución en 2.05s
```

### Estado y siguiente tarea

- **F4c cerrado.** `modules/seller/` implementado, probado y verificado.
- **Siguiente:** F4d — `modules/buyer/` (§2.4): panel del comprador, catálogo, carrito con timeout de 15 min y pasarela de checkout/pago.

```text
Status: F4c VERIFIED (modulo seller, 195 tests, build exitoso)
Task selected: modules/seller/ (Frontend-Role-Modules.md seccion 2.3)
Files changed: frontend/apps/frontend/src/modules/seller/{PanelVendedorPage,NuevoProductoPage,ProductoPage,InventarioPage,__tests__/sellerModule.test}.tsx,
               frontend/apps/frontend/src/components/{TableSkeleton.tsx,domainLabels.ts,__tests__/domainLabels.test.ts},
               frontend/apps/frontend/src/domain/ports/ZentricApiPort.ts,
               frontend/apps/frontend/src/application/services/catalog.ts,
               frontend/apps/frontend/src/application/schemas/{index.ts,schemas.test.ts},
               frontend/apps/frontend/src/adapters/http/ZentricHttpClient.ts,
               frontend/apps/frontend/src/layouts/navigation.ts,
               frontend/apps/frontend/src/app/routes/{routeTree.tsx,PanelSegunRol.tsx},
               frontend/apps/frontend/src/App.test.tsx,
               frontend/apps/frontend/vite.config.ts (testTimeout: 15000),
               frontend/apps/frontend/src/modules/admin/{BodegasPage,DevolucionesPage,UsuariosPage}.tsx
Commands: pnpm typecheck; pnpm lint; pnpm test; pnpm build
Results: typecheck 0 err - lint 0 err - 195/195 tests PASS - build exitoso
Remaining blockers: ninguno (Q-28 aplazado por el Owner)
Next action: F4d - modules/buyer/ (Frontend-Role-Modules.md seccion 2.4)
```

## Run record (run-09: F4d — módulo del Comprador — 2026-10-12)

- **runId:** `run-2026-10-12-frontend-f4d-buyer`
- **fase:** F4d (`modules/buyer/`, panel de comprador, catálogo, carrito, reserva de 15 min, checkout atómico, pedidos, pago).
- **autoridad:** `Frontend-Role-Modules` §2.4 y §4, `Frontend-Design-System` §3–§4,
  `Frontend-Adapters` §5; reglas de negocio verificadas contra `backendSDD/` y `ZENTRIC.md`.

### Qué se implementó

| Pieza | Detalle |
|---|---|
| `PanelCompradorPage` | Panel de comprador con tarjetas de acceso rápido (catálogo, carrito) y tabla de pedidos recientes con estados e insignias semánticas |
| `CatalogoPage` | Catálogo público (Q19); si el usuario no está autenticado, 'Comprar' redirige a `/entrar?redirect=/catalogo`; compradores crean/reutilizan carrito activo y agregan ítems |
| `CarritoPage` | Inspección de carrito activo, tabla de ítems, totales formateados por servidor, advertencia de reserva de 15 min (PED-01), confirmación atómica de checkout |
| `PedidosPage` | Listado de pedidos con filtro reactivo por estado (`OrderStatus`), badges semánticos, importe y enlaces directos al detalle |
| `DetallePedidoPage` | Ficha completa del pedido, desglose de ítems, estado strictly inmutable para `Paid`, diálogo de pago simulado para `PendingPayment`, facturas asociadas |
| `ZentricApiPort` & `ZentricHttpClient` | Método `listOrders(status?: string): Promise<OrderListItem[]>` |
| `domainLabels.ts` | Rótulos y tonos semánticos para `OrderStatus` (PendingPayment, Paid, InPreparation, Dispatched, Delivered, Cancelled) |
| `routeTree.tsx` & `navigation.ts` | `/catalogo` (ruta pública en root), `/carrito`, `/pedidos`, `/pedidos/$id`; enlaces en barra de navegación para Comprador |
| `PanelSegunRol` | Redirección de `/` a `PanelCompradorPage` para usuarios con rol `Buyer` |
| `buyerModule.test.tsx` | 8 pruebas completas de integración de todo el flujo del comprador |

### Evidencia (comandos)

```text
pnpm typecheck  -> 0 errores
pnpm lint       -> 0 errores
pnpm test       -> 205/205 tests PASS (47 @zentric/ui + 158 app)
```

### Estado y siguiente tarea

- **F4d cerrado.** `modules/buyer/` implementado, probado y verificado.
- **Siguiente:** F4e — `modules/logistics/` (§2.5): panel de operador logístico, despachos (`packFulfillment`, `dispatchFulfillment`, `deliverFulfillment`), reporte de stock fantasma / quiebre (`cancelGhostStock`), inspección de devoluciones (`inspectReturn`).

```text
Status: F4d VERIFIED (modulo buyer, 205 tests, typecheck/lint en verde)
Task selected: modules/buyer/ (Frontend-Role-Modules.md seccion 2.4)
Files changed: frontend/apps/frontend/src/modules/buyer/{PanelCompradorPage,CatalogoPage,CarritoPage,PedidosPage,DetallePedidoPage,index.ts,__tests__/buyerModule.test}.tsx,
               frontend/apps/frontend/src/domain/ports/ZentricApiPort.ts,
               frontend/apps/frontend/src/adapters/http/ZentricHttpClient.ts,
               frontend/apps/frontend/src/application/services/orders.ts,
               frontend/apps/frontend/src/components/{domainLabels.ts,__tests__/domainLabels.test.ts},
               frontend/apps/frontend/src/layouts/navigation.ts,
               frontend/apps/frontend/src/app/routes/{routeTree.tsx,PanelSegunRol.tsx},
               frontend/apps/frontend/src/App.test.tsx
Commands: pnpm typecheck; pnpm lint; pnpm test
Results: typecheck 0 err - lint 0 err - 205/205 tests PASS
Remaining blockers: ninguno
Next action: F4e - modules/logistics/ (Frontend-Role-Modules.md seccion 2.5)
```

## Run record (run-10: F4e — módulo del Operador Logístico — 2026-10-12)

- **runId:** `run-2026-10-12-frontend-f4e-logistics`
- **fase:** F4e (`modules/logistics/`, panel logístico, despachos, empaque, transportadora, confirmación de entrega, reporte de quiebre/stock fantasma, inspección de devoluciones).
- **autoridad:** `Frontend-Role-Modules` §2.5 y §3–§4, `Frontend-Design-System` §3–§4, `Frontend-Adapters` §5; reglas de negocio verificadas contra `backendSDD/Domain/07-lifecycle.md` y `backendSDD/Presentation/01-endpoints.md`.

### Qué se implementó

| Pieza | Detalle |
|---|---|
| `PanelLogisticaPage` | Panel operativo con 4 métricas (Por Empacar, Empacados, En Tránsito, Devoluciones), accesos rápidos y tabla de operaciones recientes |
| `DespachosPage` | Cola operativa de despachos (`/despachos`), filtro por `FulfillmentStatus`, transiciones de ciclo de vida (`packFulfillment`, `dispatchFulfillment`, `deliverFulfillment`) y enlace a reporte de quiebre |
| `DetalleDespachoPage` | Ficha técnica (`/despachos/$id`), trazabilidad de guía de envío, alerta destructiva si fue cancelado por stock fantasma |
| `ReportarQuiebrePage` | Cancelación de despacho por stock fantasma (`cancelGhostStock`, ADR-0014) con diálogo de confirmación estricto |
| `InspeccionDevolucionesPage` | Inspección física en bodega (`inspectReturn`, §2.5 / Q-24) con dictamen obligatorio de estado físico (`isGoodCondition`) |
| `DevolucionesSegunRol` | Despacho desacoplado en `/devoluciones`: inspección física para `LogisticsOperator`, reembolsos para `Administrator` |
| `ZentricApiPort` & `ZentricHttpClient` | `listFulfillments(status?: string)`, `getFulfillment(id: string)`, `getReturn(id: string)` y filtro opcional en `listReturns` |
| `domainLabels.ts` | Rótulos y tonos semánticos para `FulfillmentStatus` (PendingPack, Packed, Dispatched, Delivered, Cancelled) |
| `routeTree.tsx` & `navigation.ts` | Rutas `/despachos`, `/despachos/$id`, `/despachos/$id/quiebre`, `/devoluciones`; enlaces de navegación según rol |
| `PanelSegunRol` | Redirección de `/` a `PanelLogisticaPage` para usuarios con rol `LogisticsOperator` |
| `logisticsModule.test.tsx` | 8 pruebas completas de integración que validan el ciclo de vida, stock fantasma e inspección de devoluciones |

### Evidencia (comandos)

```text
pnpm typecheck  -> 0 errores
pnpm lint       -> 0 errores
pnpm test       -> 215/215 tests PASS (168 app + 47 @zentric/ui)
pnpm build      -> build de producción exitoso en 2.86s
```

### Estado y siguiente tarea

- **F4e cerrado.** `modules/logistics/` implementado, probado y verificado.
- **Siguiente:** F4f — Módulos compartidos y solicitud de devolución (`/devoluciones/nueva`, ADR-0010/Q-24), seguido de F5 (auditoría visual/a11y) y F7 (empaquetado Docker).

```text
Status: F4e VERIFIED (modulo logistics, 215 tests, build exitoso)
Task selected: modules/logistics/ (Frontend-Role-Modules.md seccion 2.5)
Files changed: frontend/apps/frontend/src/modules/logistics/{PanelLogisticaPage,DespachosPage,DetalleDespachoPage,ReportarQuiebrePage,InspeccionDevolucionesPage,index.ts,__tests__/logisticsModule.test}.tsx,
               frontend/apps/frontend/src/domain/ports/ZentricApiPort.ts,
               frontend/apps/frontend/src/adapters/http/ZentricHttpClient.ts,
               frontend/apps/frontend/src/application/services/{logistics.ts,orders.ts,returns.ts},
               frontend/apps/frontend/src/components/{domainLabels.ts,__tests__/domainLabels.test.ts},
               frontend/apps/frontend/src/layouts/navigation.ts,
               frontend/apps/frontend/src/app/routes/{guards.ts,routeTree.tsx,PanelSegunRol.tsx,DevolucionesSegunRol.tsx},
               frontend/apps/frontend/src/modules/buyer/{CarritoPage,CatalogoPage,DetallePedidoPage,PanelCompradorPage,PedidosPage}.tsx,
               frontend/apps/frontend/src/App.test.tsx
Commands: pnpm typecheck; pnpm lint; pnpm test; pnpm build
Results: typecheck 0 err - lint 0 err - 215/215 tests PASS - build exitoso
Remaining blockers: ninguno
Next action: F4f - modulos compartidos / solicitar devolucion (Frontend-Role-Modules.md)
```

## Run record (run-11: F4f — módulos compartidos y solicitud de devolución — 2026-10-12)

- **runId:** `run-2026-10-12-frontend-f4f-shared-modules`
- **fase:** F4f (`modules/shared-modules/`, solicitud de devolución `/devoluciones/nueva`, exclusión por ley de productos digitales, configuración y gestión de sesión `/configuracion`).
- **autoridad:** `Frontend-Role-Modules` §2.6 y §4, `Frontend-Design-System` §3–§4; reglas de negocio verificadas contra `backendSDD/Domain/10-returns.md` (**ADDENDUM Dominio 10** dictado por Owner) y `ADR-0009` / `ADR-0010`.

### Qué se implementó

| Pieza | Detalle |
|---|---|
| `SolicitarDevolucionPage` | Radicación de devoluciones (`/devoluciones/nueva`) para Comprador y Administrador. Consulta reactiva de líneas de pedido, selección de bodega de entrega y cantidad. **Aplica estrictamente ADDENDUM Dominio 10**: si el producto es `Digital`, el botón de devolución nunca se presenta ("Excluido por Ley") |
| `ConfiguracionPage` | Pantalla transversal `/configuracion` disponible para los 5 roles. Muestra Nombre, Email, UUID y Rol con insignias semánticas (`TONOS_DE_ROL`), nota de transparencia sobre tokens en memoria volátil (Q15-B / ADR-0009) y botón de cierre de sesión con modal de confirmación |
| `domainLabels.ts` | Mapa `TONOS_DE_ROL` (Administrator: danger, Seller: info, Buyer: success, LogisticsOperator: warning, Supervisor: neutral) con tests unitarios asociados |
| `routeTree.tsx` & `navigation.ts` | Rutas `/devoluciones/nueva` y `/configuracion` registradas en el árbol; entrada "Configuración" en la navegación lateral para los 5 roles |
| `sharedModules.test.tsx` | 7 pruebas completas de integración que validan guards de rol, 403 con sesión conservada, consulta de pedidos, exclusión de productos digitales, radicación exitosa y logout |

### Evidencia (comandos)

```text
pnpm typecheck  -> 0 errores
pnpm lint       -> 0 errores
pnpm test       -> 222/222 tests PASS (175 app + 47 @zentric/ui)
pnpm build      -> build de producción exitoso en 1.38s (2369 módulos)
dotnet test     -> 580/580 tests PASS (backend .NET 10 intacto)
```

### Estado y siguiente tarea

- **F4 COMPLETO (F4a a F4f cerrados).** 100% de los roles de Zentric (Público, Administrador, Vendedor, Comprador, Operador Logístico y módulos compartidos) implementados y probados.
- **Siguiente:** F5 (Verificación de consistencia del Design System, a11y y responsive) y F7 (Empaquetado y verificación de despliegue Docker).

```text
Status: F4 VERIFIED (todos los modulos por rol completados: F4a, F4b, F4c, F4d, F4e, F4f)
Task selected: F4f - modulos compartidos (Frontend-Role-Modules.md seccion 2.6)
Files changed: frontend/apps/frontend/src/modules/shared-modules/{SolicitarDevolucionPage,ConfiguracionPage,index.ts,__tests__/sharedModules.test}.tsx,
               frontend/apps/frontend/src/components/{domainLabels.ts,__tests__/domainLabels.test.ts},
               frontend/apps/frontend/src/layouts/navigation.ts,
               frontend/apps/frontend/src/app/routes/routeTree.tsx,
               frontend/apps/frontend/vitest.setup.ts
Commands: pnpm typecheck; pnpm lint; pnpm test; pnpm build; dotnet test
Results: typecheck 0 err - lint 0 err - 222/222 frontend tests PASS - 580/580 backend tests PASS - build exitoso
Remaining blockers: ninguno
Next action: F5/F7 - Entrega final y empaquetado Docker verificado
```




