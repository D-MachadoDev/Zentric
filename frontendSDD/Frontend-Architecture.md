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
| `modules/` | `components/`, `application/`, adaptadores | construir URLs o cabeceras a mano |
| `app/` | todo lo anterior | — |

**Prohibición absoluta:** ningún archivo fuera de `adapters/http/` contiene la
cadena `fetch(`, ni construye rutas `/api/...` concatenadas, ni escribe cabeceras
`Authorization`.

---

## 3. Estructura de carpetas

```text
frontend/
├── src/
│   ├── app/                  # Composition Root: router, providers, layout, guardas
│   ├── domain/               # Modelos y puertos. Sin dependencias externas.
│   │   ├── models/           # Producto, Variante, Bodega, Pedido, Despacho, Factura
│   │   ├── enums/            # Roles y estados (constantes explícitas)
│   │   └── ports/            # Interfaces: ZentricApiPort, SessionPort, AlertPort
│   ├── application/
│   │   ├── services/         # Casos de uso de cliente
│   │   └── dto/              # Formatos de entrada/salida de los servicios
│   ├── adapters/
│   │   ├── http/             # Único punto de contacto con la red
│   │   ├── session/          # Único punto de lectura/escritura de sesión
│   │   └── alert/            # Único punto que invoca el diálogo de alerta
│   ├── components/           # Design system reutilizable
│   ├── modules/              # Módulos por rol
│   │   ├── public/           # Entrada sin sesión
│   │   ├── admin/            # Administrador
│   │   ├── seller/           # Vendedor
│   │   ├── buyer/            # Comprador
│   │   ├── logistics/        # Operador logístico
│   │   └── shared-modules/   # Visible para varios roles
│   ├── styles/               # Tokens y estilos globales
│   └── main.tsx              # Punto de entrada
├── public/                   # Activos estáticos
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
├── Dockerfile
└── README.md

---

## 4. Puertos del dominio

Interfaces que definen **qué** necesita el cliente, nunca **cómo** se obtiene.

```ts
// domain/ports/ZentricApiPort.ts
export interface ZentricApiPort {
  getHealth(): Promise<HealthStatus>;
  listUsers(): Promise<User[]>;
  createUser(input: CreateUserInput): Promise<string>;
  listWarehouses(): Promise<Warehouse[]>;
  createWarehouse(input: CreateWarehouseInput): Promise<string>;
  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product>;
  createProduct(input: CreateProductInput): Promise<string>;
  addStock(input: AddStockInput): Promise<string>;
  createCart(buyerId: string): Promise<string>;
  addCartItem(input: AddCartItemInput): Promise<void>;
  getOrder(id: string): Promise<Order>;
  checkoutOrder(orderId: string): Promise<boolean>;
  payOrder(orderId: string): Promise<boolean>;
  generateInvoices(orderId: string): Promise<boolean>;
  createFulfillment(input: CreateFulfillmentInput): Promise<string>;
  dispatchFulfillment(id: string): Promise<boolean>;
  requestReturn(input: RequestReturnInput): Promise<string>;
}
```

```ts
// domain/ports/SessionPort.ts
export interface SessionPort {
  getToken(): string | null;
  setToken(token: string): void;
  clear(): void;
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
| `src/app/__tests__` | Guardas de rol y redirecciones |

```

> **Nota:** el prompt de orquestación recibido propone los nombres
> `natural-customer`, `business-customer`, `teller`, `commercial`,
> `internal-analyst`. Se sustituyen por los **roles reales de Zentric**.
> Mantener los nombres del prompt importaría un dominio ajeno.
