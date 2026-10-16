# Arquitectura del Frontend (Frontend Architecture)

> Especificación formal de la arquitectura del cliente web Zentric. Deriva de la Arquitectura Hexagonal del sistema ([`backendSDD/02-software-architecture.md`](../backendSDD/02-software-architecture.md)), la Ley funcional ([`ZENTRIC.md`](../ZENTRIC.md)) y los 25 Architecture Decision Records (ADRs).

---

## 1. Principio Rector: Arquitectura Hexagonal en el Cliente

El cliente replica la **regla de dependencia unidireccional hacia el centro** del backend: los detalles tecnológicos (transporte HTTP, almacenamiento volátil, diálogos visuales) se ubican en la periferia como adaptadores, mientras que el núcleo de dominio del cliente permanece desacoplado de librerías externas o APIs de red:

```text
              UI (Módulos por Rol, Páginas y Vistas)
                            │  depende de
                            ▼
           Lógica de Aplicación (Servicios, ViewModels, Zod)
                            │  depende de puertos
                            ▼
              Dominio Frontend (Modelos, Invariantes, Puertos)
                            ▲
                            │  implementa puertos
           Adaptadores (HTTP Fetch, Sesión en RAM, Notificaciones)
                            │
                            ▼
                 API Zentric Backend (Servicio Externo .NET 10)
```

---

## 2. Capas y Reglas de Dependencia Inviolables

| Capa | Puede Importar | **Estrictamente Prohibido** Importar |
|---|---|---|
| **`domain/`** | Nada del proyecto (TypeScript puro) | React, `fetch`, `axios`, `window`, `localStorage`, `sessionStorage`. |
| **`application/`** | `domain/` | React (salvo tipos de presentación), llamadas a `fetch()`, manipulación de red. |
| **`adapters/`** | `domain/`, `application/` | Componentes visuales de UI, hooks de React contextuales. |
| **`packages/ui`** | `tokens/`, Primitivas Radix UI | Código de `apps/frontend`, endpoints, tokens JWT, lógica de negocio. |
| **`modules/`** | `packages/ui`, `application/`, `domain/` (modelos), `useAuth` | Invocar `fetch()` directamente, construir URLs `/api/...` manualmente. |
| **`app/`** | Todas las capas anteriores | — (Es el Composition Root del frontend). |

### Monopolio Absoluto de Red:
El archivo `src/adapters/http/HttpClient.ts` es el **único punto autorizado en todo el proyecto** para ejecutar la instrucción `fetch()`. Ninguna vista, servicio o componente puede comunicarse con la red saltándose este adaptador.

---

## 3. Estructura de Carpetas (Monorepo Turborepo + pnpm)

El proyecto se estructura como un monorepo administrado con **Turborepo y pnpm workspaces**, separando físicamente el sistema de diseño reutilizable de la aplicación web del marketplace:

```text
frontend/                        # Raíz del monorepo (entorno contenerizado en Docker)
├── apps/
│   └── frontend/               # Aplicación SPA cliente (Vite + React 19 + TypeScript)
│       ├── index.html
│       ├── src/
│       │   ├── app/            # Composition Root: TanStack Router, providers y guardas
│       │   │   ├── routes/     # Árbol de rutas tipadas con code-splitting automático
│       │   │   └── providers/  # QueryClientProvider, ThemeProvider, AuthProvider
│       │   ├── domain/         # Núcleo de Dominio Frontend (TypeScript puro sin dependencias)
│       │   │   ├── models/     # Entidades: Product, Order, Inventory, Warehouse, Invoice
│       │   │   ├── enums/      # Enumeraciones exactas de la Ley (cero sinónimos)
│       │   │   └── ports/      # Interfaces: ZentricApiPort, SessionPort, NotificationPort
│       │   ├── application/    # Casos de uso y orquestación de cliente
│       │   │   ├── services/   # Hooks de TanStack Query (useQuery, useMutation)
│       │   │   ├── schemas/    # Esquemas Zod que replican FluentValidation
│       │   │   └── dto/        # Objetos de transferencia y contratos de formulario
│       │   ├── adapters/       # Implementación técnica de infraestructura
│       │   │   ├── http/       # Cliente HTTP nativo con inyección Bearer y Problem Details
│       │   │   ├── session/    # Retención de token JWT en memoria RAM (Sin refresh)
│       │   │   └── notify/     # Adaptador de notificaciones accesibles (Toasts)
│       │   ├── layouts/        # Layouts estructurales por rol (DashboardLayout, AuthLayout)
│       │   ├── modules/        # Pantallas por rol (buyer, seller, admin, logistics, supervisor)
│       │   └── styles/         # Variables globales y directivas CSS
│       ├── package.json
│       └── vite.config.ts
├── packages/
│   ├── ui/                     # Design System agnóstico al negocio y a la red
│   │   └── src/
│   │       ├── tokens/         # Tokens semánticos: colors.ts, typography.ts, spacing.ts
│   │       ├── primitives/     # Primitivas atómicas Radix UI (Button, Input, Badge, Skeleton)
│   │       ├── composite/      # Componentes ricos (DataTable, ResponsiveDrawer, StatCard)
│   │       └── logo/           # Monograma y logomarca oficial Zentric (SVG propio)
│   ├── config/                 # Presets compartidos de TypeScript, Tailwind v4 y ESLint
│   └── api-client/             # Tipos derivados del contrato OpenAPI del backend
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.json
```

**Regla de Dependencia de Paquetes:**
```text
apps/frontend  ───▶  packages/ui  ───▶  packages/config
      │                     ▲
      ▼                     │
packages/api-client ────────┘
```
`packages/ui` **nunca** importa de `apps/frontend`. `packages/config` no importa de nadie.

---

## 4. Puertos del Dominio Frontend

Interfaces que dictan **qué** necesita el sistema, sin depender del **cómo**:

```typescript
// domain/ports/ZentricApiPort.ts
//
// Los inputs no contienen CallerId ni CallerRole: la identidad se extrae
// directamente del token JWT en el backend (ADR-0013 / Propiedad del recurso).
export interface ZentricApiPort {
  getHealth(): Promise<HealthStatus>;

  // Autenticación y Usuarios
  login(input: LoginInput): Promise<AuthToken>;
  currentUser(): Promise<CurrentUser>;
  listUsers(role?: UserRole): Promise<User[]>;
  createUser(input: CreateUserInput): Promise<string>;
  blockUser(id: string): Promise<void>;
  activateUser(id: string): Promise<void>;

  // Catálogo de Productos
  // El parámetro vendorId opcional permite al vendedor consultar sus productos suspendidos
  listProducts(vendorId?: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product>;
  createProduct(input: CreateProductInput): Promise<CreatedProduct>;
  publishProduct(productId: string): Promise<void>;
  suspendProduct(productId: string): Promise<void>;

  // Inventarios y Bodegas
  addStock(input: AddStockInput): Promise<string>;
  listInventoryByVariant(variantId: string): Promise<Inventory[]>;
  listWarehouses(vendorId?: string): Promise<Warehouse[]>;
  createWarehouse(input: CreateWarehouseInput): Promise<string>;

  // Pedidos y Checkout (Ventana de 15 minutos)
  createCart(): Promise<string>;
  addCartItem(input: AddCartItemInput): Promise<void>;
  getOrder(id: string): Promise<Order>;
  checkoutOrder(orderId: string): Promise<void>;
  payOrder(orderId: string): Promise<void>;

  // Facturación y Liquidación Split
  generateInvoices(orderId: string): Promise<boolean>;
  getInvoicesByOrder(orderId: string): Promise<Invoice[]>;

  // Logística y Despachos
  createFulfillment(input: CreateFulfillmentInput): Promise<string>;
  packFulfillment(id: string): Promise<void>;
  dispatchFulfillment(id: string): Promise<void>;
  deliverFulfillment(id: string): Promise<void>;
  cancelGhostStock(input: CancelGhostStockInput): Promise<boolean>;

  // Devoluciones y Garantías
  requestReturn(input: RequestReturnInput): Promise<string>;
  inspectReturn(id: string, input: InspectReturnInput): Promise<void>;
  approveReturn(returnRequestId: string): Promise<void>;
  rejectReturn(returnRequestId: string): Promise<void>;
  listReturns(): Promise<ReturnRequest[]>;
  refundReturn(id: string): Promise<void>;
}
```

```typescript
// domain/ports/SessionPort.ts
//
// Política de seguridad estricta: El token JWT vive exclusivamente en la memoria RAM
// de JavaScript. No hay refresh token (ADR-0009); al recargar o expirar, se solicita reautenticación.
export interface SessionPort {
  getAccessToken(): string | null;
  setAccessToken(token: string): void;
  clear(): void;
  getRole(): UserRole | null;
  setRole(role: UserRole): void;
  getUserId(): string | null;
  setUserId(id: string): void;
}
```

---

## 5. Manejo Centralizado de Errores (RFC 7807)

El cliente mapea de forma estructurada los errores devueltos por el backend:

```typescript
// domain/models/ApiProblemDetails.ts
export interface ApiProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: Record<string, string[]>;
}
```

| Código HTTP | Diagnóstico de Negocio | Comportamiento en la Interfaz |
|---|---|---|
| **`400 Bad Request`** | Error de validación o violación de invariante de dominio. | Muestra el detalle junto al formulario; **preserva los datos editados por el usuario**. |
| **`401 Unauthorized`** | Token expirado (60 min) o firma inválida. | **Purga la sesión de memoria RAM** y redirige forzosamente al login con aviso de sesión caducada. |
| **`403 Forbidden`** | Privilegios insuficientes para el rol autenticado. | **Conserva la sesión** y despliega una alerta de acceso denegado sin alterar la identidad. |
| **`404 Not Found`** | Recurso inexistente o propiedad ajena ([ADR-0013](../backendSDD/Adr/0013-propiedad-del-recurso-por-rol.md)). | Renderiza vista de estado vacío contextual (`StateView`), no un error fatal. |
| **`500 Internal Server Error`** | Excepción técnica no controlada en el backend. | Presenta mensaje amigable de contingencia con botón de reintento (`refetch`). |

---

## 6. Estado de Servidor e Invalidación de Caché

TanStack Query administra las consultas remotas mediante políticas estructuradas:
- **`staleTime: 30_000` (30 segundos):** Los datos se consideran frescos durante 30s para evitar peticiones repetitivas al navegar entre pestañas.
- **`retry: (failureCount, error) => ...`:** Desactivado para cualquier error de la familia `4xx` (validaciones, autenticación, permisos).
- **Invalidación Dirigida tras Mutaciones:**
  - Tras `checkoutOrder`: se invalida `['orders', orderId]` y `['inventories']`.
  - Tras `payOrder`: se invalidan `['orders']` y `['fulfillments']`.
  - Tras `addStock`: se invalida `['inventories', variantId]`.
  - Tras `deliverFulfillment`: se actualiza el estado logístico a `Delivered`.

---

## 7. Decisiones Técnicas y Arquitectónicas Vinculantes

| Dimensión Técnica | Solución Arquitectónica | Justificación Técnica Vinculante |
|---|---|---|
| **Enrutamiento** | **TanStack Router** | Enrutamiento tipado (Type-Safe Routing) con layouts anidados y guardas de rol síncronas en `beforeLoad`. |
| **Estado Remoto** | **TanStack Query** | Manejo declarativo del ciclo de vida de peticiones, caché en memoria y sincronización automática. |
| **Formularios** | **React Hook Form + Zod** | Validación defensiva en cliente que previene peticiones inválidas antes del envío HTTP. |
| **Seguridad de Sesión** | **Token JWT en memoria RAM (Sin Refresh)** | Máximo aislamiento de credenciales ([ADR-0009](../backendSDD/Adr/0009-autenticacion-jwt-rg01.md)), prohibiendo `localStorage`. |
| **Sistema de Diseño** | **Tailwind v4 (`@theme`) + Radix UI** | Tokens semánticos en CSS sin archivos JS de configuración, Geist Sans/Mono y doctrina anti-IA genérica. |
| **Monorepo** | **Turborepo + pnpm workspaces** | Desacoplamiento físico entre UI agnóstica (`packages/ui`) y la aplicación de negocio (`apps/frontend`). |
