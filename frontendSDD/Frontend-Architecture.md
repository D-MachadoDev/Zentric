# Frontend-Architecture

> Especificación de la arquitectura del cliente Zentric. Deriva de
> [`../backendSDD/02-software-architecture.md`](../backendSDD/02-software-architecture.md)
> (Arquitectura Hexagonal) y de [`Frontend-SDD.md`](Frontend-SDD.md).

---

## 1. Principio rector

El cliente replica la **regla de dependencia hacia el centro** del backend: los
detalles de tecnología (HTTP, almacenamiento, alertas) quedan en el borde, y el
modelo del dominio del cliente no los conoce.

```text
        UI (componentes, páginas)
              │  depende de
              ▼
      Aplicación (casos de uso, sesión)
              │  depende de puertos
              ▼
        Dominio (modelos, reglas de presentación)
              ▲
              │  implementa puertos
     Adaptadores (HTTP, sesión, alertas)
              │
              ▼
          API Zentric (externo)
```

---

## 2. Capas y dependencias permitidas

| Capa | Puede importar | **Prohibido** importar |
| --- | --- | --- |
| `domain/` | nada del proyecto | React, `fetch`, `axios`, SweetAlert2, `window`, `localStorage` |
| `application/` | `domain/` | React (salvo tipos de presentación), `fetch`, alertas |
| `adapters/` | `domain/`, `application/` | componentes de UI |
| `components/` | `domain/`, `application/`, adaptadores de presentación | lógica de negocio de la Ley |
| `layouts/` | `domain/` (sólo tipos), `application/`, componentes de UI, `app/providers` (hooks de sesión) | construir URLs o cabeceras a mano |
| `modules/` | `components/`, `application/`, adaptadores, `app/providers` (hooks de sesión) | construir URLs o cabeceras a mano |
| `app/` | todo lo anterior | — |

**`layouts/` es el armazón de la consola** (barra lateral y navegación por rol,
§3): no decide reglas ni llama a la API, sólo compone el armazón y reparte los
enlaces filtrados por el rol de la sesión.

**`app/providers` es la única excepción permitida a los módulos**, y no por
comodidad: el estado de sesión no vive en `application/`. `C4-3-Componentes.md`
declara el arco `modules → providers` en su diagrama y `C4-4-Codigo-React.md` §3
prescribe `useAuth()` como consumidor desde páginas, layouts y guardas. El resto
de `app/` —rutas, layouts y composición— **no** es importable desde un módulo.

**Prohibición absoluta:** ningún archivo fuera de `adapters/http/` contiene la
cadena `fetch(`, ni construye rutas `/api/...` concatenadas, ni escribe cabeceras
`Authorization`.

---

## 3. Estructura de carpetas (Monorepo — Q10)

> **Monorepo Turborepo + pnpm workspaces (Q10).** El Owner prioriza el SEO y la
> reutilización del design system, así que el código se separa por paquetes.

```text
frontend/                        # Raíz del monorepo (Q16-A: conserva Docker/CI)
├── apps/
│   └── frontend/               # La aplicación (Vite + React 19 + TS + Tailwind)
│       ├── index.html
│       ├── src/
│       │   ├── app/            # Composition Root: TanStack Router, providers, guardas
│       │   │   ├── routes/     # Rutas type-safe (Q11), code-splitting automático
│       │   │   └── providers/  # QueryClient, Theme, Auth
│       │   ├── domain/         # Modelos, reglas de presentación y puertos. Sin dependencias externas.
│       │   │   ├── models/     # Producto, Variante, Bodega, Pedido, Despacho, Factura
│       │   │   ├── enums/      # Roles y estados (constantes explícitas)
│       │   │   ├── rules/      # Reglas de presentación derivadas de la Ley
│       │   │   └── ports/      # ZentricApiPort, SessionPort, AlertPort
│       │   ├── application/
│       │   │   ├── services/   # Casos de uso de cliente
│       │   │   ├── schemas/    # Zod por caso de uso (Q13)
│       │   │   └── dto/        # Formatos de entrada/salida
│       │   ├── adapters/
│       │   │   ├── http/       # Único punto de contacto con la red (TanStack Query)
│       │   │   ├── session/    # Access token en memoria; sin refresh (Q15-B)
│       │   │   └── alert/      # Único punto que invoca el diálogo de alerta
│       │   ├── components/     # Componentes propios de la app
│       │   ├── layouts/        # RootLayout (shell raíz), ConsoleLayout (armazón por rol)
│       │   ├── modules/        # Módulos por rol (admin/seller/buyer/logistics/public)
│       │   └── styles/         # Estilos globales
│       ├── package.json
│       └── vite.config.ts
├── packages/
│   ├── ui/                     # Design System: shadcn/ui adaptado (Q5/Q14)
│   │   └── src/
│   │       ├── tokens/         # colors.ts, typography.ts, spacing.ts (Q7/Q8)
│   │       ├── components/
│   │       │   ├── ui/         # shadcn/ui base
│   │       │   └── logo/       # LogoMark, LogoWordmark, Logo (Q6)
│   │       ├── hooks/          # useMediaQuery, useDebounce
│   │       └── lib/            # cn(), formatters (moneda, fecha)
│   ├── config/                 # TS, Tailwind, ESLint compartidos
│   └── api-client/             # Cliente tipado de la API (fase posterior)
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.json
```

**Regla de dependencia entre paquetes:**

```text
apps/frontend  →  packages/ui  →  packages/config
       └────────────┴── packages/api-client
```

`packages/ui` **no** importa de `apps/frontend`. `packages/config` no importa de nadie.

---

## 4. Puertos del dominio

Interfaces que definen **qué** necesita el cliente, nunca **cómo** se obtiene.

```ts
// domain/ports/ZentricApiPort.ts
//
// Los `*Input` no llevan identidad del llamante (`CallerId`, `CallerRole`,
// `BuyerId`, `vendorId` en `createProduct`): la identidad sale del token y el
// servidor la aplica antes del caso de uso (Q-21b, ADR-0013).
// `createProduct` devuelve `productId` + `variantIds` (CAT-01), y `createCart`
// no acepta cuerpo porque el carrito es siempre del comprador del token.
export interface ZentricApiPort {
  getHealth(): Promise<HealthStatus>;

  login(input: LoginInput): Promise<AuthToken>;
  currentUser(): Promise<CurrentUser>;
  listUsers(): Promise<User[]>;
  createUser(input: CreateUserInput): Promise<string>;

  // `vendorId` opcional: `GET /api/catalog/products?vendorId=` devuelve la vista
  // de gestión del dueño (también `Suspended`); sin él es el catálogo comercial (Q-27).
  listProducts(vendorId?: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product>;
  createProduct(input: CreateProductInput): Promise<CreatedProduct>;
  publishProduct(productId: string): Promise<void>;
  /** `POST /api/catalog/products/{id}/suspend` — saca el producto del catálogo (Q-27). Sólo Vendedor. */
  suspendProduct(productId: string): Promise<void>;

  addStock(input: AddStockInput): Promise<string>;
  listInventoryByVariant(variantId: string): Promise<Inventory[]>;

  listWarehouses(): Promise<Warehouse[]>;
  createWarehouse(input: CreateWarehouseInput): Promise<string>;

  createCart(): Promise<string>;
  addCartItem(input: AddCartItemInput): Promise<void>;
  getOrder(id: string): Promise<Order>;
  // `200 OK` sin cuerpo: el servidor no devuelve el estado resultante.
  checkoutOrder(orderId: string): Promise<void>;
  payOrder(orderId: string): Promise<void>;

  generateInvoices(orderId: string): Promise<boolean>;
  getInvoicesByOrder(orderId: string): Promise<Invoice[]>;

  // Ciclo del despacho (backendSDD Domain/07-lifecycle.md): nace en
  // `PendingPack`; hay que empacar antes de despachar y sólo el Operador
  // Logístico cierra la entrega (Q-23). Los tres responden `200 OK` sin cuerpo.
  createFulfillment(input: CreateFulfillmentInput): Promise<string>;
  packFulfillment(id: string): Promise<void>;
  dispatchFulfillment(id: string): Promise<void>;
  deliverFulfillment(id: string): Promise<void>;
  cancelGhostStock(input: CancelGhostStockInput): Promise<boolean>;

  requestReturn(input: RequestReturnInput): Promise<string>;
  inspectReturn(id: string, input: InspectReturnInput): Promise<void>;
  approveReturn(returnRequestId: string): Promise<void>;
  /**
   * `GET /api/Returns` — bandeja propia (`ADR-0017`, sin paginación aún).
   * El reparto por rol lo hace el servidor: el Comprador ve las de sus pedidos,
   * el Vendedor las de sus productos, y el Operador, el Administrador y el
   * Supervisor leen sin filtro. No admite pedir las de otro.
   */
  listReturns(): Promise<ReturnRequest[]>;
  /** `POST /api/Returns/{id}/refund` — **sólo Administrador** (Q-24); reembolsa una devolución ya aprobada. */
  refundReturn(id: string): Promise<void>;
}
```

```ts
// domain/ports/SessionPort.ts
// Q15-B: el backend NO tiene refresh (ADR-0009:62). El access token vive SOLO
// en memoria; al recargar se pierde y toca volver a autenticarse.
export interface SessionPort {
  getAccessToken(): string | null;   // en memoria
  setAccessToken(token: string): void;
  clear(): void;
  restore(): Promise<boolean>;       // GET /api/auth/me si hay token; false si no
  getRole(): UserRole | null;
  setRole(role: UserRole): void;
  getUserId(): string | null;
  setUserId(id: string): void;
}
```

```ts
// domain/ports/AlertPort.ts
export type AlertKind = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertPort {
  show(kind: Exclude<AlertKind, 'confirm'>, title: string, message?: string): Promise<void>;
  confirm(title: string, message: string, confirmLabel?: string): Promise<boolean>;
}
```

---

## 5. Manejo de errores

Un único tipo de error de dominio, traducido por el adaptador HTTP:

```ts
// domain/models/ApiError.ts
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly traceId?: string;
  constructor(status: number, detail: string, traceId?: string) { /* ... */ }
  get userMessage(): string { /* mensaje apto para el usuario */ }
}
```

| Estado | Comportamiento de la UI |
| --- | --- |
| `400` | Mostrar el mensaje del servidor junto al formulario; **conservar lo escrito** |
| `401` | Limpiar sesión y volver a la entrada con aviso de expiración |
| `403` | **Conservar** la sesión y mostrar aviso de permiso insuficiente |
| `404` | Estado vacío contextual, no error global |
| `409` | Explicar el conflicto de negocio y conservar los datos del formulario |
| `5xx` | Estado de error con reintento y `traceId` para soporte |

Nunca se muestra una traza de pila ni texto crudo de base de datos.

---

## 6. Estado de servidor y caché

- Un único proveedor de consultas en `app/`, con reintentos acotados y
  reintento desactivado en errores `4xx`.
- Las mutaciones invalidan la caché afectada: tras `checkout` se invalida el
  pedido; tras `addStock`, el inventario.
- Claves de caché componentsizadas por entidad: `['orders', id]`.

---

## 7. Configuración

| Variable | Uso | Defecto |
| --- | --- | --- |
| `VITE_API_BASE_URL` | URL base de la API | `http://localhost:5076` |

En Docker la URL puede sobreescribirse en tiempo de ejecución inyectando
`window.__ZENTRIC_API_BASE_URL__`, para no reconstruir la imagen por entorno.

---

## 8. Estructura de pruebas

| Ubicación | Qué prueba |
| --- | --- |
| `src/adapters/http/__tests__` | Cabeceras, `401`, mapeo de errores |
| `src/application/services/__tests__` | Orquestación de cada caso de uso |
| `src/components/__tests__` | Estados de UI y accesibilidad |
| `src/modules/**/__tests__` | Flujo principal de cada módulo |
| `src/app/__tests__` | Guardas de rol y redirecciones (TanStack Router `beforeLoad`) |

> **Nota:** el prompt de orquestación recibido propone los nombres
> `natural-customer`, `business-customer`, `teller`, `commercial`,
> `internal-analyst`. Se sustituyen por los **roles reales de Zentric**.
> Mantener los nombres del prompt importaría un dominio ajeno.

---

## 9. Decisiones de stack vinculantes (grill Q1–Q14)

| Aspecto | Decisión | Consecuencia arquitectónica |
| --- | --- | --- |
| Enrutamiento (Q11) | **TanStack Router** | Rutas type-safe y code-splitting; guardas de rol en `beforeLoad`. |
| Datos (Q9) | **TanStack Query** | Un solo `QueryClient` en `app/providers`; invalidación por mutación. |
| Formularios (Q13) | **React Hook Form + Zod** | Un esquema Zod por caso de uso, compartido con la forma del request. |
| Sesión (Q15-B) | **Access token en memoria; sin refresh** | El interceptor lee el token de memoria. Ante `401` cierra sesión y va al login. **No** hay reintento: el backend no expone refresh (`ADR-0009:62`). **Nunca** token en `localStorage`. |
| UI (Q5/Q14) | **shadcn/ui completo, adaptado** | El código vive en `packages/ui`; no hay dependencia externa de librería. |
