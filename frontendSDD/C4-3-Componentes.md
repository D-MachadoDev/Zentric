# C4 - Nivel 3: Componentes del Frontend

## 1. Alcance y Propósito del Nivel 3

En el modelo C4 (Simon Brown), el **Nivel 3 (Componentes)** descompone los contenedores en sus bloques funcionales constitutivos de código fuente, delimitando:
1. Las responsabilidades específicas de cada componente dentro de la arquitectura frontend.
2. El grafo estricto y unidireccional de dependencias entre paquetes y capas.
3. El aislamiento de la interfaz respecto a detalles de transporte de red y serialización.
4. Los contratos de colaboración para la gestión de estado de servidor, validación y sesión en memoria.

En Zentric, el frontend está organizado como un **Monorepo gestionado por Turborepo y pnpm** (`frontend/apps/frontend` y `frontend/packages/*`), garantizando desacoplamiento físico entre el **Design System**, la **Lógica de Aplicación**, y las **Vistas de Negocio por Rol**.

---

## 2. Diagrama de Componentes del Sistema

El siguiente diagrama detalla la arquitectura de componentes de la aplicación cliente SPA (`apps/frontend`) y su interacción con el sistema de diseño compartido (`packages/ui`) y la API backend:

```mermaid
flowchart TB
  subgraph monorepo["Monorepo Zentric Frontend (Turborepo + pnpm)"]

    subgraph pkgUI["Paquete Compartido: packages/ui (Design System)"]
      tokens["Tokens Semánticos<br/>[tokens/colors.ts, typography.ts]<br/>Paleta carbón tintado y Geist Mono/Sans"]
      primitives["Primitivas Atómicas<br/>[primitives/]<br/>Button, Input, Badge, Skeleton, Label"]
      composite["Componentes Compuestos<br/>[composite/]<br/>DataTable, ResponsiveDrawer, ModalDialog, StatCard"]
      tokens --> primitives
      primitives --> composite
    end

    subgraph appFrontend["Aplicación Principal: apps/frontend/src/"]

      subgraph entryLayer["1. Inicialización y Shell"]
        entry["Punto de Entrada<br/>[main.tsx]<br/>Montaje React 19 y Bootstrap"]
        router["Enrutamiento TanStack Router<br/>[app/router.tsx]<br/>Árbol de rutas perezosas (lazy)"]
        guards["Guardas de Autorización<br/>[app/routes/ (beforeLoad)]<br/>Validación síncrona de rol y sesión"]
        providers["Proveedores de Contexto<br/>[app/providers/]<br/>QueryClient, AuthContext, ThemeProvider"]
        entry --> providers
        providers --> router
        router --> guards
      end

      subgraph modulesLayer["2. Vistas y Módulos por Rol"]
        modBuyer["Módulo Comprador<br/>[modules/buyer/]<br/>Catálogo, Carrito, Checkout, Devoluciones"]
        modSeller["Módulo Vendedor<br/>[modules/seller/]<br/>Gestión Catálogo, Stock, Despachos"]
        modAdmin["Módulo Administrador<br/>[modules/admin/]<br/>Usuarios, Bodegas, Facturación, Reembolsos"]
        modLogistics["Módulo Logística<br/>[modules/logistics/]<br/>Empaque, Despacho, Inspección Devoluciones"]
        modSupervisor["Módulo Supervisor<br/>[modules/supervisor/]<br/>Auditoría y Monitoreo (Solo Lectura)"]
        modAuth["Módulo Autenticación<br/>[modules/auth/]<br/>Login y Registro de Comprador"]
      end

      subgraph applicationLayer["3. Lógica de Aplicación y Estado Remoto"]
        appServices["Servicios de Aplicación & Hooks<br/>[application/services/]<br/>TanStack Query Hooks (useQuery, useMutation)"]
        zodSchemas["Esquemas de Validación Zod<br/>[application/schemas/]<br/>Validación defensiva tipada para formularios"]
      end

      subgraph domainLayer["4. Dominio Frontend Puro"]
        domainModels["Modelos & Entidades Frontend<br/>[domain/models/]<br/>Buyer, Order, Product, Fulfillment, Invoice"]
        domainPorts["Puertos de Entrada y Salida<br/>[domain/ports/]<br/>IHttpClient, ISessionPort, INotificationPort"]
        domainEnums["Enumeraciones Ubicuas<br/>[domain/enums/]<br/>UserRole, OrderStatus, FulfillmentStatus"]
      end

      subgraph adaptersLayer["5. Adaptadores de Infraestructura"]
        httpAdapter["Adaptador HTTP Nativo<br/>[adapters/http/]<br/>Fetch client tipado, Bearer JWT, RFC 7807"]
        sessionAdapter["Adaptador de Sesión Volátil<br/>[adapters/session/]<br/>Almacenamiento exclusivo en RAM (Sin Refresh)"]
        notificationAdapter["Adaptador de Notificaciones<br/>[adapters/notifications/]<br/>Toasts y alertas contextuales"]
      end

    end
  end

  apiBackend["API Backend Externa<br/>[Zentric Web API :5076]<br/>44 Endpoints REST + Problem Details"]

  %% Conexiones entre capas
  guards --> modulesLayer
  modulesLayer --> composite
  modulesLayer --> appServices
  modulesLayer --> zodSchemas

  appServices --> domainModels
  appServices --> domainPorts
  appServices --> httpAdapter

  httpAdapter --> sessionAdapter
  httpAdapter --> domainPorts
  httpAdapter -->|"Peticiones HTTPS (JSON)"| apiBackend

  %% Clases de estilo C4
  classDef entryStyle fill:#1e293b,stroke:#334155,stroke-width:2px,color:#f8fafc;
  classDef moduleStyle fill:#0369a1,stroke:#0284c7,stroke-width:2px,color:#ffffff;
  classDef appStyle fill:#0f766e,stroke:#0d9488,stroke-width:2px,color:#ffffff;
  classDef domainStyle fill:#4338ca,stroke:#4f46e5,stroke-width:2px,color:#ffffff;
  classDef adapterStyle fill:#b45309,stroke:#d97706,stroke-width:2px,color:#ffffff;
  classDef uiStyle fill:#374151,stroke:#4b5563,stroke-width:2px,color:#ffffff;
  classDef externalStyle fill:#1f2937,stroke:#111827,stroke-width:2px,color:#9ca3af;

  class entry,router,guards,providers entryStyle;
  class modBuyer,modSeller,modAdmin,modLogistics,modSupervisor,modAuth moduleStyle;
  class appServices,zodSchemas appStyle;
  class domainModels,domainPorts,domainEnums domainStyle;
  class httpAdapter,sessionAdapter,notificationAdapter adapterStyle;
  class tokens,primitives,composite uiStyle;
  class apiBackend externalStyle;
```

---

## 3. Catálogo Detallado de Componentes

### 3.1 Paquete Compartido `packages/ui` (Design System)
Este paquete es completamente agnóstico al negocio y a la red; no conoce endpoints, rutas ni tokens JWT:

| Componente | Directorio | Responsabilidad Técnica | Dependencias Permitidas |
|---|---|---|---|
| **Tokens Semánticos** | `packages/ui/src/tokens/` | Define paletas de neutros tintados (`#0B0F19`, `#111827`, `#1F293D`), acento semántico (`#00D4AA`, `#FFB800`) y fuentes Geist. | Ninguna (CSS nativo `@theme`). |
| **Primitivas Atómicas** | `packages/ui/src/primitives/` | Controles elementales accesibles: `Button`, `Input`, `Badge`, `Skeleton`, `Textarea`, `Checkbox`. Basados en Radix UI. | `tokens/`. |
| **DataTable Compuesta** | `packages/ui/src/composite/DataTable/` | Tabla de alta densidad para inventarios y órdenes con ordenamiento, filtrado, paginación y renderizado en Geist Mono. | `primitives/`, TanStack Table. |
| **ResponsiveDrawer** | `packages/ui/src/composite/Drawer/` | Panel lateral deslizante para edición de recursos y detalles rápidos sin perder el contexto de la tabla. | `primitives/`. |
| **ModalDialog** | `packages/ui/src/composite/Modal/` | Diálogos modales para confirmaciones críticas (cancelación de órdenes, ajustes de inventario). | `primitives/`. |
| **StatCard** | `packages/ui/src/composite/StatCard/` | Tarjeta asimétrica de métricas operativas con bordes de bajo contraste y tipografía 600/700. | `primitives/`. |

---

### 3.2 Aplicación Principal `apps/frontend`

#### Capa 1: Inicialización, Enrutamiento y Shell (`src/app/`)
- **`main.tsx` (Punto de Entrada):** Inicializa la instancia única de `QueryClient` con políticas de stale-time y reintentos, monta el árbol React en `#root` y encapsula la aplicación en `ErrorBoundary`.
- **`router.tsx` (TanStack Router Shell):** Define la jerarquía de rutas basada en código (`createRouter`), asociando layouts principales (`DashboardLayout`, `AuthLayout`, `PublicLayout`) y habilitando carga perezosa (`lazy`).
- **`beforeLoad` Route Guards:** Interceptores de navegación ejecutados síncronamente antes de renderizar una ruta protegida. Verifican la presencia de sesión activa en `ISessionPort` y comprueban que el rol del usuario coincida con las políticas autorizadas para la sección.

#### Capa 2: Módulos Funcionales por Rol (`src/modules/`)
Cada módulo encapsula las pantallas de un actor del marketplace:
- **`modules/buyer/`:** Vistas de catálogo público, ficha de producto, carrito reactivo con precio congelado, asistente de checkout de 15 minutos y seguimiento de pedidos y garantías.
- **`modules/seller/`:** Dashboard de métricas comerciales, administración de productos (publicación/suspensión), monitoreo de existencias por SKU y empaque de órdenes de despacho.
- **`modules/admin/`:** Panel de control de usuarios, apertura de bodegas volumétricas, liquidación de facturas maestras/split y auditoría de reembolsos.
- **`modules/logistics/`:** Cola de despachos en bodega, certificación de entrega con número de guía y protocolo de inspección física para devoluciones.
- **`modules/supervisor/`:** Vistas de solo lectura para fiscalización transversal de inventarios, traza de auditoría y reportes operacionales.

#### Capa 3: Lógica de Aplicación (`src/application/`)
- **`application/services/` (Hooks de Consulta y Mutación):** Encapsulan `useQuery` y `useMutation` de TanStack Query. Orquestan la invalidación de claves de caché ante mutaciones exitosas (ej. tras `payOrder`, invalidar `orders` y `cart`).
- **`application/schemas/` (Validación con Zod):** Esquemas fuertemente tipados que replican los contratos de validación de FluentValidation del backend. Validan formularios antes del envío y generan tipos TypeScript derivados (`z.infer<typeof schema>`).

#### Capa 4: Dominio Frontend Puro (`src/domain/`)
- **Modelos y Value Objects:** Representaciones inmutables de las entidades del marketplace (`Buyer`, `CustomerOrder`, `FulfillmentOrder`, `Invoice`, `Money`).
- **Puertos Abstractos:** Interfaces (`IHttpClient`, `ISessionPort`, `INotificationPort`) que desacoplan las reglas del cliente de las librerías técnicas.
- **Enumeraciones:** Mapeo 1:1 con los enums del backend (`UserRole`, `OrderStatus`, `FulfillmentStatus`, etc.), garantizando cero sinónimos y serialización estricta como texto.

#### Capa 5: Adaptadores de Infraestructura (`src/adapters/`)
- **`adapters/http/HttpClient.ts`:** **Único componente autorizado en todo el proyecto para ejecutar `fetch()`**. Aplica el token Bearer en las cabeceras, intercepta respuestas no exitosas y transforma las cargas RFC 7807 (`application/problem+json`) en instancias de error de dominio tipadas.
- **`adapters/session/MemorySessionAdapter.ts`:** Implementa `ISessionPort` reteniendo el token JWT exclusivamente en la memoria RAM de JavaScript. Ante recarga del navegador o recepción de un HTTP `401 Unauthorized`, purga la sesión inmediatamente sin recurrir a `localStorage`, cumpliendo la política estricta de sesión volátil sin refresh token ([ADR-0009](./backendSDD/Adr/0009-autenticacion-jwt-rg01.md)).

---

## 4. Invariantes y Reglas de Dependencia Hexagonal

Para preservar la mantenibilidad y evitar el acoplamiento cruzado, se establecen las siguientes reglas arquitectónicas inviolables:

```mermaid
flowchart LR
    modules["modules (Vistas)"]
    app["application (Hooks/Zod)"]
    domain["domain (Modelos/Puertos)"]
    adapters["adapters (Fetch/RAM)"]
    ui["packages/ui (Design System)"]

    modules -->|Consume| app
    modules -->|Dibuja con| ui
    app -->|Orquesta| domain
    app -->|Invoca| adapters
    adapters -->|Implementa| domain

    style domain fill:#4338ca,stroke:#4f46e5,stroke-width:2px,color:#fff
    style ui fill:#374151,stroke:#4b5563,stroke-width:2px,color:#fff
```

1. **Aislamiento de `packages/ui`:** `packages/ui` tiene **estrictamente prohibido** importar cualquier archivo de `apps/frontend`. No contiene lógica de negocio, no conoce endpoints ni accede a tokens.
2. **Dominio Agnóstico:** `domain/` no puede importar React, hooks, APIs del navegador (`window`, `document`) ni librerías de transporte (`fetch`). Es TypeScript puro.
3. **Monopolio de Red:** Queda prohibido el uso de `fetch` o clientes HTTP fuera de `adapters/http/`. Las vistas nunca construyen URLs ni gestionan cabeceras `Authorization`.
4. **Almacenamiento Seguro de Credenciales:** Prohibido el uso de `localStorage` o `sessionStorage` para guardar tokens JWT. La sesión reside en RAM; si el token expira (60 min), el usuario debe reautenticarse.
5. **Manejo Cuádruple de Estado en Vistas:** Toda pantalla o componente que consuma datos asíncronos debe manejar explícitamente los 4 estados de la UI:
   - **Cargando (`isLoading`):** Muestra primitivas `Skeleton` con dimensiones proporcionales.
   - **Vacío (`isEmpty`):** Muestra vista de estado vacío con acción de recuperación.
   - **Error (`isError`):** Muestra Problem Details amigable con opción de reintento (`refetch`).
   - **Éxito (`isSuccess`):** Renderiza la tabla o formulario con datos frescos.

---

## 5. Dinámica de Colaboración entre Componentes

### 5.1 Flujo de Consulta Remota (Query Pipeline)

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario
    participant View as Página / Módulo (modules/)
    participant Hook as Application Service (useQuery)
    participant Cache as TanStack Query Cache
    participant Adapter as HttpClient (adapters/http)
    participant Backend as Zentric Web API (:5076)

    User->>View: Accede a la pantalla de inventario
    View->>Hook: Invoca useInventoryQuery(filters)
    Hook->>Cache: Consulta datos existentes por QueryKey
    alt Datos en caché válidos (fresh)
        Cache-->>View: Retorna datos en memoria inmediatamente
    else Datos obsoletos o ausentes (stale)
        Hook->>Adapter: get("/api/inventories", filters)
        Adapter->>Adapter: Inyecta Bearer Token desde MemorySession
        Adapter->>Backend: GET /api/inventories (HTTPS JSON)
        alt Respuesta Exitosa 200 OK
            Backend-->>Adapter: 200 OK [JSON Payload]
            Adapter-->>Cache: Guarda payload en caché
            Cache-->>View: Emite estado isSuccess con datos frescos
            View->>View: Renderiza DataTable (packages/ui)
        else Error de Negocio 400 / 403 / 404
            Backend-->>Adapter: Problem Details (RFC 7807)
            Adapter->>Adapter: Traduce a DomainError tipado
            Adapter-->>Cache: Registra fallo
            Cache-->>View: Emite estado isError con mensaje estructurado
            View->>View: Muestra alerta contextual con botón de reintento
        end
    end
```

### 5.2 Flujo de Autenticación y Expiración Ineludible

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario
    participant LoginView as Módulo Auth (LoginForm)
    participant AuthContext as AuthProvider (app/providers)
    participant SessionAdapter as MemorySessionAdapter (adapters/session)
    participant Adapter as HttpClient (adapters/http)
    participant Backend as Zentric Web API (:5076)

    User->>LoginView: Ingresa correo y contraseña
    LoginView->>Adapter: POST /api/auth/login
    Backend-->>Adapter: 200 OK { token, role, email }
    Adapter-->>AuthContext: Emite credencial validada
    AuthContext->>SessionAdapter: setToken(token) (Solo en RAM)
    AuthContext-->>LoginView: Redirección automática según rol

    Note over Adapter,Backend: Tras 60 minutos de inactividad, el token expira en el servidor
    User->>LoginView: Ejecuta acción protegida
    Adapter->>Backend: GET /api/orders (Token expirado)
    Backend-->>Adapter: 401 Unauthorized (Token expired)
    Adapter->>SessionAdapter: clearToken() (Purga inmediata de RAM)
    Adapter-->>AuthContext: Notifica evento de sesión cerrada
    AuthContext->>User: Redirección forzada a /login con aviso de expiración
```

---

## 6. Integración con la Doctrina Visual Anti-IA Genérica

Los componentes del Nivel 3 reflejan en su implementación las directrices semánticas de diseño:
1. **Neutros Tintados:** Superficies y tarjetas utilizan fondos carbón (`#111827`) con bordes atenuados (`#1F293D`), eliminando fondos negros puros `#000000` o grises desaturados genéricos.
2. **Jerarquía Tipográfica Robusta:** Las cabeceras de módulos y títulos de modales aplican Geist Sans con peso 600 o 700; los identificadores (SKUs, IDs de orden, importes monetarios y estados) se renderizan obligatoriamente con **Geist Mono** para máxima legibilidad tabular.
3. **Color de Acento Unificado:** Las acciones primarias emplean el tono esmeralda/cian suave (`#00D4AA`), reservando el ámbar (`#FFB800`) para estados de advertencia (órdenes pendientes de pago, ventanas de 15 minutos activas). Quedan excluidos los degradados multicolores ("AI gradient text") y los bordes con barras de colores chillones en tarjetas.
