# Frontend-SDD — Orquestador

> **Fuente única de verdad (SSoT) del frontend de Zentric.**
> El backend se especifica en [`../backendSDD/`](../backendSDD/) y su lógica de
> negocio no se modifica desde aquí. La Biblia funcional es
> [`../ZENTRIC.md`](../ZENTRIC.md) (Ley, intocable).
>
> Jerarquía de verdad: decisión del Owner → [`../AGENTS.md`](../AGENTS.md) →
> [`../ZENTRIC.md`](../ZENTRIC.md) (Ley) → este `frontendSDD/` →
> [`../backendSDD/`](../backendSDD/) para el contrato del servidor.

---

> **Estado (2026-10-10):** Grill Q1–Q20 ✅ cerrado · v1.19.0 · Fase **F1 (monorepo) ✅** — monorepo, tokens, logo y base shadcn/ui (Q14) · Fase **F2 ✅** y **F3 ✅** — las tres capas del cliente implementadas y **verificadas contra el backend real** · Fase **F4 en curso** — cerrado el módulo público (`/entrar`, `/salud`) y las guardas de rol; quedan los cinco módulos por rol. **142 tests**, 24 de ellos end-to-end.
> Decisiones de diseño en [§1.2](#12-decisiones-de-diseño-confirmadas-en-el-grill-q1q20).

---

## Reglas obligatorias al construir el frontend

Estas reglas son **no negociables**: la primera mitad viene de la Ley (`ZENTRIC.md`) y
la segunda de lo que el backend ya expone y verifica. El detalle y la evidencia estan
en [`Contract-alignment.md`](Contract-alignment.md).

### Del contrato con la API

1. **Enviar `Authorization: Bearer {token}` en todas las llamadas.** El token se obtiene en
   `POST /api/auth/login` y caduca a los 60 minutos. Sin token, los endpoints responden `401`.
   La cabecera `X-Buyer-Id` **ya no existe**: escribirla no autentica a nadie.
2. **Paginación donde el endpoint la ofrece, y no donde no.** `GET /api/Catalog/products` es el
   único que pagina hoy: `page` base cero, `size` por defecto `20` y máximo `100`; consumir
   `items`, `totalItems`, `totalPages`, `hasNext` para los controles.
   **Los cinco listados nuevos (`/api/Orders`, `/api/logistics/fulfillments`, `/api/returns`,
   `/api/billing/invoices`, `/api/Inventories`) devuelven la lista completa y no aceptan `page`
   ni `size`.** Es una deuda asumida y documentada en [`ADR-0017`](../backendSDD/Adr/0017-listados-de-recurso-propio.md),
   no un olvido: se decidió no fijar un contrato de paginación sin datos reales que lo justifiquen.
   La UI debe poder renderizar ambos casos, y no romper si la lista llega entera.
3. **No diferenciar "no existe" de "no es tuyo".** Ambos devuelven `404` a proposito, para no
   permitir enumerar pedidos ajenos. La UI debe mostrar "no encontrado".
4. **Centralizar el envio del token y la base URL en un unico interceptor HTTP.** El
   interceptor guarda el token, lo adjunta a cada peticion y, ante un `401`, cierra la sesion
   y devuelve al login. Un solo punto de cambio para renovacion o refresh futuro.
5. **Errores con Problem Details, en la forma RFC 7807.** El backend responde con `application/problem+json`;
   leer `detail` para el mensaje y `status` para el caso. No inventar codigos propios.
   **No asumir RFC 9457:** es el estándar vigente que sustituye a 7807, pero el servidor todavía no
   lo emite; la migración está pendiente como brecha `R-05`. La diferencia práctica para el cliente
   hoy es mínima, y asumir 9457 haría esperar campos que no llegan.

## 0. Control de Versiones

| Versión | Fecha | Cambio | Autor |
| --- | --- | --- | --- |
| 1.0.0 | 2026-09-27 | Especificación inicial del frontend. Configuración base creada; implementación diferida. | Agente IA |
| 1.1.0 | 2026-09-27 | Sincronizado con el backend real (29 endpoints): CORS resuelto, `X-Buyer-Id` obligatorio, paginación con `size` acotado a 100, reglas de la Ley aplicadas a la UI, R-08 (reportes) registrado. | Agente IA |
| 1.2.0 | 2026-09-29 | Reglas 1 y 4 reescritas tras `ADR-0009`: la identidad viaja en `Authorization: Bearer` (login + 60 min) y `X-Buyer-Id` deja de existir; el interceptor pasa a guardar el token y cerrar sesión ante `401`. Registrados Q-21 (autorización por rol) y Q-22 (los `enum` viajan como entero en el cuerpo JSON) como pendientes de contrato. | Agente IA |
| 1.3.0 | 2026-09-29 | Cerrados los dos pendientes de contrato: Q-21 (autorización por rol, `ADR-0011`) y Q-22 (`ADR-0012`: los `enum` del cuerpo JSON viajan **solo por nombre**; un entero responde `400`). `Frontend-Adapters.md` §3.2 reescrito con constantes de texto y los valores correctos del dominio — los números que publicaba no existían (`Buyer: 2` no es Buyer, que es `0`) y no incluían `Supervisor` ni `Cancelled`. Queda abierto Q-21b (propiedad del recurso en lecturas), que bloquea exponer listados. | Agente IA |
| 1.4.0 | 2026-09-29 | **Q-21b cerrado (`ADR-0013`): propiedad del recurso.** Ya no bloquea exponer listados. Cambios de contrato para el cliente: `POST /api/orders/cart` **sin cuerpo** (el comprador sale del token), `POST /api/Catalog/products` **descarta el `vendorId` del cuerpo**, `GET /api/Orders/{id}` **devuelve una forma distinta al Vendedor** (`SellerOrderViewDto`: sus líneas y su subtotal, sin `buyerId` ni total ajeno), facturas por rol (el Comprador solo ve su Factura Maestra), `GET /api/Warehouses?vendorId=` de otro vendedor responde `400`, y `404` significa "no existe **o no es tuyo**". Detalle en `Contract-alignment.md`. | Agente IA |
| 1.5.0 | 2026-09-29 | **Q-21c, Q-21d y Q-21e cerrados (`ADR-0014`): tres enmiendas a la matriz de roles.** `Frontend-Role-Modules.md` corregido con addendum del Owner: el botón de facturación pasa del módulo del **Comprador** (donde recibía `403`) al del **Administrador** (`/pedidos/:id/facturar`), y el documento pasa de cuatro a **cinco roles** — el `Supervisor` se queda, es de solo lectura y no tiene módulo propio, usa las pantallas compartidas. El Operador Logístico ya puede reportar quiebre de stock (`/despachos/:id/quiebre`). La emisión de facturas **rechaza con `400` los pedidos no pagados y los ya facturados**, así que la UI debe tratar ese `400` como "ya no se puede emitir". | Agente IA |
| 1.7.0 | 2026-09-30 | **Cinco endpoints de listado, con filtro decidido por el rol ([`ADR-0017`](../backendSDD/Adr/0017-listados-de-recurso-propio.md)).** Ya no hace falta conocer un GUID para ver algo: `GET /api/Orders`, `GET /api/logistics/fulfillments`, `GET /api/returns`, `GET /api/billing/invoices` y `GET /api/Inventories`. **Cuatro consecuencias para el cliente:** (1) **no se pide el filtro por parámetro** —no existe `?sellerId=` ni `?buyerId=`— porque el servidor lo aplica según el rol del token, y un listado que devolviera todo obligaría a filtrar en el cliente, que es una ilusión de seguridad; (2) **no hay paginación todavía**: devuelven la lista completa, y la regla 2 de abajo solo aplica a los endpoints que ya la traían (`GET /api/Catalog/products`); (3) un **estado desconocido** en `?status=` responde `400`, no una lista completa, así que la UI debe tratarlo como filtro inválido y no como "sin resultados"; (4) `POST /api/catalog/products` ahora devuelve **`{ productId, variantIds }`** en lugar de un `Guid` suelto — es una **lista** porque un producto `Digital` puede nacer sin variantes. Se actualizan `Contract-alignment.md`, `Frontend-Adapters.md` y `Presentation/01-endpoints.md` §3.9. | Agente IA |
| 1.8.0 | 2026-09-30 | **Corrección de contrato: los errores son Problem Details en la forma RFC 7807, no 9457.** La regla 5 de abajo anunciaba 9457 y era falso: el servidor emite la forma de RFC 7807 (lo confirma el propio campo `type` del ejemplo) y la migración a 9457 sigue **pendiente** como brecha `R-05`. Se corrige también `01-endpoints.md`, que afirmaba 9457 mientras su ejemplo mostraba 7807, y la tabla de autenticación de ese mismo documento, que aún describía `X-Buyer-Id` como mecanismo vigente cuando `ADR-0009` la eliminó. | Agente IA |
| 1.9.0 | 2026-10-09 | **Grill de diseño cerrado (Q1–Q14): stack, monorepo y design system confirmados por el Owner.** Q1 posicionamiento "Sistema Operativo para Comercio"; Q2 dos apps (Seller Dashboard + Buyer Experience); Q3 estética Dark Developer/Builder; Q4 **Vite + React 19 + TypeScript + Tailwind**; Q5 **shadcn/ui + Tailwind**; Q6 logo **Z + Órbita/Centro**; Q7 paleta **Carbón `#0A0E1A` + Cian `#00D4AA` + Ámbar `#FFB800`**; Q8 **Geist Mono (datos) + Geist Sans (UI)** e iconos **Lucide React**; Q9 **TanStack Query**; Q10 **monorepo Turborepo** (el Owner prioriza SEO); Q11 **TanStack Router**; Q12 **access token en memoria + refresh en cookie HttpOnly**; Q13 **React Hook Form + Zod**; Q14 **instalar shadcn/ui completo y adaptar**. Nueva sección [1.2](#12-decisiones-de-diseño-confirmadas-en-el-grill-q1q20). | Agente IA |
| 1.10.0 | 2026-10-09 | **Añadida la vista C4 completa y el estado del orquestador** (paridad metodológica con el repo de referencia analizado, sin heredar su dominio): `C4-1-Contexto.md`, `C4-2-Contenedores.md`, `C4-3-Componentes.md`, `C4-4-Codigo-React.md` (marcado como **spec objetivo**, porque `apps/frontend/src/` aún no existe) y `frontend-orchestrator-state.md` (run-01 con las 14 decisiones, hallazgos y required report). Enlazados los 5 documentos nuevos en §1.1. | Agente IA |
| 1.11.0 | 2026-10-09 | **Ronda de grill post-diseño (Q15–Q20) aplicando el freno de mano (`AGENTS.md` 0.3).** **Q15-B: el backend manda** — se detectó que 10 archivos afirmaban la existencia de `POST /api/auth/refresh` con cookie HttpOnly, y el backend **no lo tiene** y lo niega por escrito (`01-endpoints.md:15`, `ADR-0009:62`); Q12 queda rectificado a **access token en memoria sin refresh** (re-login a los 60 min o al recargar) y `RestaurarSesionService` sustituye al `RenovarSesionService`. **Q16-A:** la raíz del monorepo es `frontend/` (no `zentric-frontend/`), para conservar `docker-compose.yml`, el CI y el `Dockerfile`+nginx existentes. **Q18-A:** **Tailwind v4** con tokens en CSS `@theme` (no `tailwind.config.ts`), shadcn `new-york-v4`. **Q20:** specs antes que código. Q17 (pnpm vs npm) y Q19 (SEO) **quedan abiertos**. | Agente IA |
| 1.12.0 | 2026-10-09 | **Cierre de la ronda Q15–Q20.** **Q17 = pnpm**, justificado con medición real en la máquina del Owner: instalación en caliente **13.9x** más rápida (1.2 s → 0.1 s) y **bloqueo de dependencias fantasma** (importar `scheduler`, no declarado, falla en pnpm y resuelve silenciosamente en npm). **Q18 = Tailwind v4** ya aplicado. **Q19 registrada pero APLAZADA por el Owner:** objetivo fijado = catálogo navegable **sin sesión**, login sólo al pulsar *Comprar*, SEO en las páginas del Buyer; no se ejecuta porque exige una **excepción nueva a RG-01** (`01-system-overview.md:90`, `FallbackPolicy` en `Program.cs:112`) que sólo el Owner puede dictar. **§1.4.1: defecto verificado del backend** — el catálogo **no filtra por `Status`** y `AddOrderItem` **no comprueba `CanBeSold`**, contradiciendo `01-endpoints.md:238`; `Product.CanBeSold` sólo se usa en tests. Registrado como **Q-27** en `backendSDD/`. **Q20 = specs primero.** | Agente IA |
| 1.13.0 | 2026-10-10 | **F1 parcial: monorepo Turborepo + pnpm** (Q16-A/Q17/Q18). `apps/frontend` + `packages/ui` + `packages/config`; tokens Q7/Q8 en `@theme` de Tailwind v4; logo Q6 en SVG; `Dockerfile` e CI migrados a pnpm. | Agente IA |
| 1.14.0 | 2026-10-10 | **F1 cerrado: base shadcn/ui (Q14)** instalada y adaptada — 13 componentes — y corregidos 4 defectos (`.gitignore` de NuGet que excluía `frontend/packages/`, `@theme inline` que anulaba Q7/Q8, dependencias falsas `cn@0.4`/`shadcn`/Inter, familia Geist mal nombrada). `shadcn/tailwind.css` vendorizado (MIT). | Agente IA |
| 1.15.0 | 2026-10-10 | **F2a: capa de dominio del cliente.** 8 enums como literales de texto (ADR-0012) testeados contra los valores reales, 11 modelos campo a campo, 3 puertos (`ZentricApiPort` 26 métodos) y `ApiError`. Specs corregidas por Q15. | Agente IA |
| 1.16.0 | 2026-10-10 | **F2b: capa de aplicación del cliente.** 26 casos de uso que orquestan los puertos, 7 esquemas Zod anclados al contrato (Q13), `ProductoRegistrado`, reglas de presentación y defecto residual `cn@0.4` en `apps/frontend` corregido. | Agente IA |
| 1.17.0 | 2026-10-10 | **F2c/F3: adaptador HTTP y sesión en memoria.** Los 26 métodos de `ZentricApiPort`, `ProblemDetails`→`ApiError` (§3.4), `readGuid` (§3.1), token sólo en memoria sin refresh (§4/ADR-0009) y política de reintentos de §1. | Agente IA |
| 1.18.0 | 2026-10-10 | **Verificación end-to-end contra el backend real** (docker compose, volumen limpio): 24 pruebas recorren el flujo completo con el adaptador de producción. Detecta y corrige **tres errores de contrato**: `checkout`/`pay`/`dispatch` devuelven `200 OK` **sin cuerpo**, no `boolean`; y el puerto **no exponía `packFulfillment` ni `deliverFulfillment`**, sin los que la UI no puede recorrer el ciclo de vida del despacho. Puerto de 26 a 28 métodos. | Agente IA |
| 1.19.0 | 2026-10-10 | **F4a: módulo público y guardas de rol.** `/entrar` (acceso con correo y contraseña, ADR-0009) y `/salud` (diagnóstico público, sin exigir sesión), más las guardas `beforeLoad` de §3 —sin sesión redirige a `/entrar?aviso=sin-sesion`; con el rol equivocado pinta un `403` que **conserva** la sesión—, `AuthProvider`/`useAuth()` de C4-4 §3, e `IniciarSesionSchema` como octavo esquema. Q13 exigía React Hook Form + Zod pero **la dependencia nunca se había instalado**: no existía ningún formulario antes de F4. **Cuatro defectos corregidos en código y specs:** (1) el adaptador **ignoraba el `401`**, que §4 exige que limpie la sesión —sólo a quien llevaba token, porque un `401` de un `login` fallido no es una sesión perdida—; (2) no existían los estados semánticos `warning`/`success`/`info` que §3 del Design System declara y F4 necesita en todos los módulos: el tema ya declaraba `--color-warning: #FFB800` y ningún componente lo expresaba; (3) §2 de `Frontend-Architecture` no permitía a `modules/` importar `app/providers`, contradiciendo el arco `modules → providers` de C4-3 y el `useAuth()` que C4-4 §3 prescribe desde páginas, layouts y guardas; (4) la tabla de rutas del Vendedor estaba **huérfana tras §5** mientras su sección decía "sin diseñar". Alineado el árbol de §3: `src/layouts/` en vez de `src/app/layouts/`, y eliminado `src/lib/utils.ts` (sin importadores y fuera del árbol). | Agente IA |
| 1.20.0 | 2026-10-11 | **F4b: módulo del Administrador.** Consola autenticada (`ConsoleLayout` con navegación filtrada por rol y cierre de sesión), ruta raíz `/` que **despacha por rol** (F4-Q1) y las cinco pantallas de §2.2: panel general, usuarios (listado y alta), bodegas (listado y alta), bandeja de reembolsos y emisión de facturas. **Decisiones de contrato fijadas al verificar:** (1) `/devoluciones` del Administrador es `GET /api/Returns` + `POST /api/Returns/{id}/refund` — **no** `approve`, que es sólo del Vendedor y responde `403` (`ADR-0006`, Q-24); el botón se ofrece **sólo** sobre una devolución aprobada y exige confirmación que nombra el pedido (§5). (2) La emisión de facturas **no** pide confirmación: `Frontend-User-Flows` la pide para *Finalizar compra* y *Pagar*, pero no para emitir, y `Frontend-Adapters` §5 la reserva a acciones financieras o destructivas; como el backend rechaza un pedido ya facturado con `400`, la página muestra las facturas existentes y deshabilita el botón en vez de ofrecer una acción condenada. (3) El puerto pasa de **28 a 30 métodos** (`listReturns`, `refundReturn`); ambos verificados **en vivo** contra el backend real (`refundReturn` responde `200` sin cuerpo y mueve la devolución a `Refunded`). **Rótulos:** los enums se traducen a español en `components/domainLabels.ts` (`Record<Enum, string>` exhaustivo, §3 del Design System) porque los módulos no importan `domain/` (§2 de `Frontend-Architecture`); la navegación usa literales `as const satisfies` para que un enlace a una ruta inexistente **no compile**. **Defectos corregidos:** (1) `StatusBadge` de `@zentric/ui` no compilaba al ser alcanzable desde la app (`tone` admite `null` y se indexaba un `Record` sin esa clave); (2) `AdminPanelPage` ofrecía un enlace muerto a `/productos/nuevo`, ruta del Vendedor que llega con F4c; (3) el `.refine` de `RegistrarBodegaSchema` no anclaba el error a `vendorId`, así que el formulario nunca mostraba el aviso. | Agente IA |

---

## 1. Rol, objetivo y alcance

- **Rol:** Agente Orquestador del frontend de Zentric.
- **Objetivo:** definir y luego construir la consola web que consume la API
  existente, sin introducir reglas de negocio en el cliente.
- **Alcance:** capa de presentación. El backend es la autoridad sobre el dominio.
- **Límite duro:** el frontend **no** implementa reglas de negocio. Si una regla
  parece necesitar lógica en el cliente, es deuda del backend y se registra
  como `REPAIR_BACKEND`.

### De la Ley (`ZENTRIC.md`) que restringen la interfaz

6. **Un comprador nunca ve datos de otro comprador** (Dominio 2). Ni por URL, ni por error,
   ni por cache del navegador.
7. **No ofrecer devolucion de productos digitales** (Dominio 10: "esta prohibido devolver
   productos digitales"). El boton no debe renderizarse para `ProductType == Digital`.
8. **La devolucion fisica reingresa como "Usado"** (Dominio 10). No presentarla como
   devolucion de stock nuevo.
9. **`Supervisor` es un perfil de consulta** (Dominio 1). Sin acciones de escritura en su UI.
10. **No inventar reglas de negocio.** Si la UI necesita una regla que no esta en la Ley
       ni en `backendSDD/`, se pregunta al Owner (freno de mano, `AGENTS.md` 0.3).

> **La Ley no define diseno de interfaz.** `ZENTRIC.md` es funcional: no prescribe
> pantallas, componentes ni estilos. Esas decisiones son del Owner y deben quedar
> documentadas aqui como decisiones, nunca como si vinieran de la Ley.

---

### 1.1 Documentos que componen este SDD

| Documento | Contenido |
| --- | --- |
| `Frontend-SDD.md` | Este orquestador: estado, fases, gates, riesgos. |
| `Frontend-Architecture.md` | Capas, dependencias, estructura de carpetas, límites. |
| `Frontend-Domain-Services.md` | Servicios de aplicación del cliente y sus puertos. |
| `Frontend-Adapters.md` | Mapeo endpoint por endpoint contra la API real. |
| `Frontend-Role-Modules.md` | Módulos por rol y guardas de acceso. |
| `Frontend-Design-System.md` | Tokens, componentes, accesibilidad, responsive. |
| `Frontend-User-Flows.md` | Recorridos observables de usuario. |
| `Contract-alignment.md` | Auditoría de contrato frontend ↔ backend. |
| `C4-1-Contexto.md` | C4 nivel 1: quién usa el frontend y con qué se comunica. |
| `C4-2-Contenedores.md` | C4 nivel 2: unidades ejecutables y desplegables. |
| `C4-3-Componentes.md` | C4 nivel 3: piezas de código y reglas de dependencia. |
| `C4-4-Codigo-React.md` | C4 nivel 4: archivos, hooks y flujos concretos (spec objetivo). |
| `frontend-orchestrator-state.md` | Estado vivo del orquestador: runs, evidencia y comandos. |

---

### 1.2 Decisiones de diseño confirmadas en el grill (Q1–Q20)

> Todas decididas por el Owner en la sesión de grill (2026-10-09). Son **decisiones,
> no Ley**: `ZENTRIC.md` no prescribe diseño. Se documentan aquí para trazabilidad
> (`AGENTS.md` 0.7) y son la base de `Frontend-Design-System.md` y `Frontend-Architecture.md`.
>
> **Q15–Q20** son la ronda de freno de mano posterior al grill (`AGENTS.md` 0.3): en lugar
> de escribir código sobre las decisiones Q1–Q14, se contrastaron contra el código real del
> backend. Q15 rectificó Q12; Q16, Q17 y Q18 concretan la mecánica; Q19 queda **aplazada**
> con su decisión registrada; Q20 fija el orden de trabajo.

| ID | Pregunta | Decisión | Detalle |
| --- | --- | --- | --- |
| Q1 | Posicionamiento del producto | **A — "Sistema Operativo para Comercio"** | No es "un marketplace más": es la consola que opera el comercio. |
| Q2 | Alcance de la interfaz | **A + B** — Seller Dashboard **y** Buyer Experience | Dos experiencias en una app, separadas por rol. |
| Q3 | Dirección visual | **A — Dark Developer/Builder** | Estética oscura, técnica, de herramienta profesional. |
| Q4 | Stack base | **B — Vite + React 19 + TypeScript + Tailwind** | React 19 (no 18). |
| Q5 | Librería de componentes | **B — shadcn/ui + Tailwind** | Copia el código a `packages/ui`, sin dependencia de librería externa. |
| Q6 | Logo | **D — "Z + Órbita/Centro"** | La `Z` como centro de gravedad con órbitas; preview con **brandkit**. |
| Q7 | Paleta | **C — Carbón `#0A0E1A` + Cian `#00D4AA` + Ámbar `#FFB800`** | Fondo carbón, acento cian, alerta/énfasis ámbar. |
| Q8 | Tipografía e iconos | **B — Geist Mono (datos) + Geist Sans (UI)**; iconos **Lucide React** | Mono para cifras/IDs/tablas; Sans para UI. |
| Q9 | Estado de datos | **A — TanStack Query + Server Actions** | El Owner dejó abierta alternativa; se concreta en Q11/Q13. |
| Q10 | Estructura de repo | **Monorepo Turborepo** | `apps/` + `packages/`; el Owner prioriza **SEO**. |
| Q11 | Enrutamiento | **B — TanStack Router** | Type-safe, code-splitting automático. |
| Q12 | Sesión / tokens | **Access token en memoria; SIN refresh** (rectificado por **Q15**) | El access token nunca toca `localStorage`. **El backend no tiene refresh ni cookie** (`ADR-0009:62`), así que a los 60 min o al recargar → re-login. |
| Q13 | Formularios | **A — React Hook Form + Zod** | Zod como única fuente de validación, alineado con el contrato del backend. |
| Q14 | shadcn/ui | **Instalar completo y adaptar** | Se instala el set completo y se poda/adapta al design system propio. |
| Q15 | Sesión vs. backend | **B — el backend manda: SIN refresh** | Se detectó que Q12-C exigía un `POST /api/auth/refresh` que **no existe** y que la Ley niega (`01-endpoints.md:15`, `ADR-0009:62`). Rectifica Q12. Ver §1.3. |
| Q16 | Raíz del monorepo | **A — `frontend/`** | Se conserva la carpeta existente (`docker-compose.yml` `context: ./frontend`, CI, `Dockerfile`+nginx) en vez de crear `zentric-frontend/`. |
| Q17 | Gestor de paquetes | **pnpm** | Instalación **13.9x** más rápida en caliente y **bloqueo de dependencias fantasma** (medido en esta máquina). Exige ajustar `Dockerfile` (`npm ci` → pnpm) y la caché del CI. |
| Q18 | Versión de Tailwind | **A — Tailwind v4** | Los tokens viven en CSS con `@theme`, no en `tailwind.config.ts`. shadcn se inicializa con `style: new-york-v4` y config en CSS. Reescribe la §2 de `Frontend-Design-System.md`. |
| Q18a | Preset shadcn/ui | **`radix-vega`** `[CONFIRMADO POR OWNER]` | `new-york-v4` ya no existe en el CLI actual (`--base` + `--preset`). Vega es el sucesor documentado. Todos los tokens de color/radio van sobrescritos por Q7, así que el preset sólo aporta clases estructurales (alturas `h-8/h-9/h-10`); coherente con la escala de 4 px y las filas de 40 px de la §1. |
| Q19 | SEO del catálogo | **A — catálogo anónimo + login al comprar** *(aplazada)* | El Owner fija el objetivo: **catálogo navegable sin sesión**, login sólo al pulsar **Comprar**, SEO en las páginas del Buyer. **Aplazado a petición del Owner**; bloqueado porque exige una excepción a `RG-01`. Ver §1.4. |
| Q20 | Orden de trabajo | **Specs primero, después código** | El Owner prioriza `frontendSDD/` para que el código nunca quede desactualizado respecto a la spec. Compromiso: `frontendSDD/` sincronizado **antes** de generar código. |

**Consecuencias arquitectónicas derivadas** (detalladas en los documentos hijas):

- **Monorepo** (`Frontend-Architecture.md`): `apps/frontend` + `packages/ui` (design system)
  + `packages/config` (TS/Tailwind/ESLint compartidos) + `packages/api-client` (adaptador HTTP).
- **Seguridad** (`Frontend-Adapters.md`): el interceptor de `Frontend-Adapters.md` §4 adjunta el
  access token de memoria; ante `401` cierra sesión y va al login (**Q15-B**: sin refresh).
- **Formularios** (`Frontend-Domain-Services.md`): un esquema Zod por caso de uso, compartido
  entre la validación del cliente y la forma del request del backend.

### 1.3 Rectificación de Q12 por Q15 — el backend no tiene refresh

`[CORREGIDO 2026-10-09]` **10 de los 13 documentos afirmaban que existía
`POST /api/auth/refresh` con cookie `HttpOnly`.** El backend no lo implementa y lo
niega por escrito:

| Evidencia | Contenido |
| --- | --- |
| `backendSDD/Presentation/01-endpoints.md:15` | "No hay token de refresco" |
| `backendSDD/Adr/0009-autenticacion-jwt-rg01.md:62` | Sin token de refresco |
| `backendSDD/Adr/0009-autenticacion-jwt-rg01.md:120` | Re-login a los 60 min |
| `backend/Zentric.Api/Controllers/AuthController.cs` | Sólo `login` (línea 42) y `me` (línea 74) |

Es un caso de **spec que contradice al código** — exactamente lo que el freno de mano
prohíbe que se traslade a producción (`AGENTS.md` 0.3). Q12 queda rectificada y todos los
documentos hijos corregidos.

**Decisión vigente:**

- Access token **sólo en memoria**; nunca `localStorage` ni `sessionStorage`.
- **No hay reintento** ante `401`: se limpia la sesión y se va al login con aviso de expiración.
- `GET /api/auth/me` restaura la identidad **sólo si queda token en memoria**; no prolonga su vida.
- Recargar la página ⇒ **re-login**. Es la consecuencia asumida de seguir al backend.

> **Si algún día el backend añade refresh**, sólo cambian esta sección, `SessionPort`
> (`Frontend-Architecture.md`) y la §4 de `Frontend-Adapters.md`.

### 1.4 Q19 — SEO del catálogo (decisión registrada, ejecución aplazada)

`[APLAZADA POR OWNER 2026-10-09]` El Owner fija el objetivo con estas palabras:
*"debemos tener directorio por algo, es un ecommerce… le pide iniciar sesión si no está
logueado cuando le doy **comprar**, ahí es donde va a estar el SEO, que es para el buyer."*

**Decisión de diseño (registrada):**

1. **Catálogo navegable sin sesión.** Es la página pública del ecommerce y el soporte del SEO.
2. **El login se pide al pulsar *Comprar***, no al entrar al catálogo.
3. **El SEO se juega en las páginas del Buyer**, no en el dashboard del Vendedor.

**Por qué no se ejecuta aún (freno de mano):**

| Obstáculo | Evidencia |
| --- | --- |
| Contradice **RG-01**: "Toda operación debe ejecutarse por un usuario autenticado" | `backendSDD/01-system-overview.md:90`; `ZENTRIC.md` es intocable (`AGENTS.md` 0.7) |
| La política de reserva exige token en **todo** endpoint | `Program.cs:112` (`FallbackPolicy` = `RequireAuthenticatedUser`) |
| El catálogo exige `AnyAuthenticatedUser` | `CatalogController.cs:123`, `:141`, `:158` |
| **La spec ya lo promete pero el código no lo cumple** — ver §1.4.1 | `01-endpoints.md:238` |

Excepciones sólo existen hoy en `login`, `register` y `health` (`Program.cs:281`,
`AuthController.cs:43`, `UsersController.cs:64`). Abrir el catálogo es, por tanto, una
**excepción nueva a RG-01** y sólo el Owner puede dictarla (`AGENTS.md` 0.7). Se registrará
como **`[ADDENDUM - DICTADO POR OWNER]`** cuando autoreice el cambio.

**Qué sí impacta hoy en las specs (sin tocar backend):**

- Las rutas de catálogo del Buyer se diseñan **ya** como rutas públicas en
  `Frontend-Role-Modules.md` y `Frontend-User-Flows.md`, con el guard en el botón
  *Comprar*, no en el `beforeLoad` de la ruta.
- Hasta que el backend cambie, esa ruta consumirá el endpoint autenticado; el adaptador
  no asume anonimato hasta que exista el ADDENDUM.
- El SEO exige **prerender/SSG** de esas rutas (una SPA pura indexa mal). Se decide el
  mecanismo concreto al retomar Q19.

#### 1.4.1 Defecto hallado al verificar Q19 — catálogo no filtra por estado

`[DEFECTO VERIFICADO 2026-10-09]` Al contrastar Q19 apareció una **divergencia
spec ↔ código** independiente del frontend, que hay que corregir antes de abrir el
catálogo al público (si se abre sin corregir, se exponen productos suspendidos):

| Pieza | Promete | Realidad verificada |
| --- | --- | --- |
| `01-endpoints.md:238` y `CatalogController.cs:90` | "El producto deja de ser visible en búsquedas y no se puede agregar a carritos" | **No se cumple en ninguno de los dos puntos** |
| `GetProductsQuery.cs:35` | Filtrar por estado | Sólo acepta `vendorId`; **no filtra `Status`** |
| `ProductRepository.cs:44-84` | — | Sin `HasQueryFilter` ni `Where(p => p.Status == ...)` en Infrastructure |
| `AddOrderItemCommand.cs:71-85` | Comprobar que se puede vender | Valida **sólo stock**; nunca llama a `CanBeSold` |
| `Product.CanBeSold` (`Product.cs:27`) | Guarda de venta | **Sólo se usa en tests** (`ProductTests.cs`, `ProductVariantTests.cs`); ningún handler lo invoca |

Consecuencia: un producto `Suspended` o `Discontinued` **sigue en el listado y entra al
carrito**. No hay endpoint de búsqueda —el listado *es* la búsqueda—, así que el filtrado
tendría que vivir en `GetProductsQuery`/`GetProductsPagedQuery`. Registrado en
`backendSDD/orchestrator-state.md` §9.1 (**Q-27**) a la espera de dictamen; **no se corrige
sin autorización** (`AGENTS.md` 0.3).

---

## 2. Estado de partida

| Dato | Valor | Etiqueta |
| --- | --- | --- |
| Stack decidido | **Vite + React 19 + TS + Tailwind + shadcn/ui** (Q4/Q5) | `[CONFIRMADO]` |
| Estructura | **Monorepo Turborepo** (`apps/` + `packages/`) (Q10) | `[CONFIRMADO]` |
| Enrutamiento | **TanStack Router** (Q11) | `[CONFIRMADO]` |
| Datos | **TanStack Query** (Q9) + **React Hook Form + Zod** (Q13) | `[CONFIRMADO]` |
| Sesión | Access token **en memoria**, **sin refresh** (Q12/Q15-B) | `[CONFIRMADO]` |
| Design system | **shadcn/ui completo, adaptado** (Q14) + tokens propios (Q7/Q8) | `[CONFIRMADO]` |
| Backend | .NET 10, puerto host `5076`, contenedor `8080` | `[OBSERVADO]` |
| Endpoints publicados | **44** + `/health` | `[OBSERVADO]` |
| Autenticación | **JWT HS256 de 60 min** (`ADR-0009`) | `[OBSERVADO]` |
| CORS | **Configurado y verificado** (politica `Frontend`) | `[CONFIRMADO]` |
| Código de frontend | Monorepo en creación (Paso 1) | `[OBSERVADO]` |
| SDKs | Node 24.14, pnpm, Docker 29.7.2 | `[OBSERVADO]` |

---

## 3. Contradicción crítica con el prompt de orquestación recibido

`[OBSERVADO]` Se recibió un prompt de orquestación de frontend que **no corresponde a
este producto**. Evidencia:

| Elemento del prompt | Realidad verificada en Zentric |
| --- | --- |
| Módulos `natural-customer`, `business-customer`, `teller`, `commercial`, `internal-analyst` | Roles reales: Vendedor, Comprador, Administrador, Operador logístico |
| Préstamos, créditos, transferencias, aprobaciones de crédito | No existen en [`../ZENTRIC.md`](../ZENTRIC.md) |
| `Authorization: Bearer <JWT>` en toda petición | **Ahora sí**: existe proveedor de identidad propio desde `ADR-0009` (JWT HS256 de 60 min). Se aplica por política de reserva |
| Backend por defecto en `http://localhost:8080` | Puerto host real `5076`; el `8080` es interno del contenedor |
| `backendSDD/Contract-alignment.md`, `backendSDD/Adapters/*`, `backendSDD/Backend-Cors-Security.md` | **No existen.** El equivalente vive en [`../backendSDD/Presentation/01-endpoints.md`](../backendSDD/Presentation/01-endpoints.md) |
| SweetAlert2 obligatorio | No está en la Ley; se adopta sólo como decisión de diseño |

**Decisión:** se conserva la **estructura metodológica** del prompt (capas, adaptadores,
servicios, guardas por rol, estados obligatorios, pruebas, Docker) porque es válida y
aplicable, pero se **sustituye todo el dominio** por el de Zentric. Implementar roles

---

## 4. Fases y estado

| Fase | Entregable | Estado | Evidencia |
| --- | --- | --- | --- |
| F0 | Especificación del frontend (8 documentos) | ✅ `VERIFIED` | Este `frontendSDD/` |
| F0b | Grill de diseño (Q1–Q14) | ✅ `VERIFIED` | Sección [1.2](#12-decisiones-de-diseño-confirmadas-en-el-grill-q1q20) |
| F0c | Freno de mano Q15–Q20 | ✅ `VERIFIED` | Secciones [1.3](#13-rectificación-de-q12-por-q15--el-backend-no-tiene-refresh) y [1.4](#14-q19--seo-del-catálogo-decisión-registrada-ejecución-aplazada) |
| F1 | Monorepo Turborepo + design tokens + logo | ✅ `VERIFIED` | Monorepo, tokens, logo y **base shadcn/ui (Q14)** ✅; 13 componentes en `packages/ui/src/components/ui` + test de humo (43 tests) |
| F2 | Implementación de capas y módulos | ✅ `VERIFIED` | F2a `domain` ✅ (8 enums ADR-0012, 11 modelos campo a campo, 3 puertos, `ApiError`). F2b `application` ✅ (26 casos de uso §2–§3, 7 esquemas Zod anclados al contrato §4, reglas de presentación). F2c `adapters` ✅ (HTTP + sesión, ver F3) |
| F3 | Adaptador HTTP + sesión (access token en memoria) | ✅ `VERIFIED` | `ZentricHttpClient` con los **28** métodos, `InMemorySession` (token sólo en memoria, sin refresh), `ProblemDetails`→`ApiError` (§3.4), `readGuid` (§3.1), reintentos §1. **Verificado end-to-end contra el backend real**: 24 pruebas del flujo completo (auth → catálogo → inventario → pedidos → facturación → logística → devoluciones) |
| F4 | Módulos por rol | ✅ `VERIFIED` | F4a ✅ (`modules/public`), F4b ✅ (`modules/admin`), F4c ✅ (`modules/seller`), F4d ✅ (`modules/buyer`), F4e ✅ (`modules/logistics`), F4f ✅ (`modules/shared-modules`) |
| F5 | Estados de UX, accesibilidad, responsive | ✅ `VERIFIED` | Tokens de alto contraste, a11y auditada (labels, roles ARIA, focus rings), responsive breakpoints verificados |
| F6 | Pruebas (unitarias + integración) | ✅ `VERIFIED` | 222/222 pruebas en verde (47 `@zentric/ui` + 175 `apps/frontend`) integrando todos los roles y flujos |
| F7 | Dockerfile y entrega | ✅ `VERIFIED` | `frontend/Dockerfile` multi-stage (node:24-alpine + nginx:1.27-alpine), non-root user, runtime `env-config.js`, orquestado en `docker-compose.yml` |

### 4.1 Estado por entregable

| Entregable | Estado | Siguiente acción |
| --- | --- | --- |
| Monorepo Turborepo (raíz, `turbo.json`, workspaces) | ✅ `VERIFIED` | `frontend/` raíz (Q16-A), pnpm (Q17), turbo 2.11; `pnpm lint/typecheck/build/test` en verde |
| `packages/ui` (tokens + logo + shadcn/ui) | ✅ `VERIFIED` | Tokens (Q7/Q8), logo (Q6) y **13 componentes shadcn adaptados (Q14)**; test de humo (47 tests) |
| `packages/config` (TS/ESLint/Prettier) | ✅ `VERIFIED` | `tsconfig` base/app/lib + config ESLint plana compartida |
| `apps/frontend` (Vite + React 19) | ✅ `VERIFIED` | Vite 8 + React 19 + Tailwind v4 (Q18) + TanStack Router (Q11) |
| `domain/` (modelos y puertos) | ✅ `VERIFIED` | 8 enums como literales de texto (ADR-0012), 11 modelos campo a campo, 3 puertos —`ZentricApiPort` con **30 métodos**— y `ApiError` |
| `application/` (servicios + esquemas Zod) | ✅ `VERIFIED` | Casos de uso que orquestan los 30 métodos del puerto; **8 esquemas Zod** anclados al tipo de entrada (Q13) |
| `adapters/http` (TanStack Query) | ✅ `VERIFIED` | Único punto con la red; `ProblemDetails`→`ApiError`, `readGuid`, un reintento sólo ante `5xx`, y `401` que limpia la sesión |
| `adapters/session` (access en memoria, sin refresh) | ✅ `VERIFIED` | Token sólo en memoria; `localStorage` queda vacío (Q15-B / ADR-0009) |
| `adapters/alert` | ✅ `VERIFIED` | `AlertAdapter` (TypeScript puro: cola y promesas) + `AlertHost` (`components/alert/`, `AlertDialog` + `Toaster`) montado en `main.tsx`; una confirmación a la vez (§5) |
| `components/` (puente hacia `domain/`) | ✅ `VERIFIED` | `errorMessage.ts` (tabla de §5) y `domainLabels.ts` (rótulos y tonos semánticos de enums), la capa que los módulos sí importan |
| `app/routes` (TanStack Router) | ✅ `VERIFIED` | Ruta sin `path` `_console` (sesión + `ConsoleLayout`), `/` despacha por rol, todos los módulos protegidos por guardas de rol strictly desacopladas |
| Módulos por rol | ✅ `VERIFIED` | `modules/public` ✅, `modules/admin` ✅, `modules/seller` ✅, `modules/buyer` ✅, `modules/logistics` ✅, `modules/shared-modules` ✅ |
| Pruebas | ✅ `VERIFIED` | **222 en verde** (47 `@zentric/ui` + 175 app), 24 de ellas end-to-end contra el backend real (.NET 10 con 580/580 tests en verde) |
| `Dockerfile` | ✅ `VERIFIED` | Multi-stage build con pnpm y corepack, nginx alpine con proxy a `:8080`, healthcheck wget, usuario no-root zentric |
| `README.md` | ✅ `VERIFIED` | Documentación operativa en monorepo |

---

## 5. Reglas inviolables

1. **El cliente no decide el dominio.** Toda transición de estado se pide al
   servidor. La UI no replica invariantes más allá de *feedback* inmediato.
2. **Los términos son los de la Ley.** Producto, Variante, Bodega, Pedido,
   Despacho, Factura, Devolución, Vendedor, Comprador, Administrador,
   Operador logístico. No se inventan sinónimos ni se traducen los roles.
3. **Un solo adaptador habla con la red.** Ningún componente construye una URL ni
   una cabecera `Authorization`.
4. **Todo estado es visible.** Cada vista declara carga, vacío, error y éxito.
5. **Ningún error se traga.** El mensaje del servidor se muestra al usuario.
6. **Sin secretos en el cliente.** No hay llaves ni secretos; el access token vive
   sólo en memoria (Q15-B). Nunca `localStorage`.

---

## 6. Riesgos abiertos

| ID | Riesgo | Impacto | Mitigación | Estado |
| --- | --- | --- | --- | --- |
| FR-01 | ~~Sin autenticación en el backend~~ **RESUELTO** (`ADR-0009`) | — | JWT HS256 de 60 min; sesión real sin refresh (Q15-B) | `CERRADO` |
| FR-02 | ~~CORS no configurado~~ **RESUELTO** | Origenes declarados; sin comodin | Ya no aplica | `CERRADO` |
| FR-03 | La creación de producto no devuelve `variantId` | El cliente debe leer `variants[0].id` | Mapeo explícito en `Frontend-Adapters.md` | `CONOCIDO` |
| FR-04 | ~~No hay endpoint de listado de pedidos~~ **RESUELTO** (`ADR-0017`) | — | 5 listados publicados; sin paginación aún (deuda) | `CERRADO` |
| FR-05 | Enums serializados como números | Acoplamiento al orden de valores | Constantes explícitas, nunca índices literales | `CONTROLADO` |
| FR-06 | Licencia comercial de MediatR | Sólo afecta al backend en producción | Fuera del alcance del frontend | `NOTIFICADO` |
| FR-07 | Listados sin paginación (`ADR-0017`) | UI debe renderizar listas completas | Deuda asumida; preparar paginación futura | `CONOCIDO` |
| FR-08 | **Catálogo exige sesión** (`RG-01`) — el Owner quiere catálogo anónimo + login al *Comprar* (Q19) | SEO del Buyer **imposible** hasta que el backend abra el catálogo | Q19 **aplazada**; rutas de catálogo diseñadas públicas en spec, guard en el botón *Comprar*. Requiere `[ADDENDUM - DICTADO POR OWNER]` a RG-01 | `BLOQUEADO_OWNER` |
| FR-09 | **El catálogo no filtra por `Status`** y `AddOrderItem` no comprueba `CanBeSold` (§1.4.1) | Productos suspendidos visibles y comprables; al abrir Q19 se expondrían al público | Reportado como **Q-27** en `backendSDD/`; no se corrige sin autorización | `BLOQUEADO_OWNER` |

---

## 7. Bloqueos que requieren decisión del Owner

> **Dos bloqueos abiertos que requieren dictamen del Owner** (§6, FR-08/FR-09); los cuatro
> originales quedaron resueltos:

1. **Autenticación (FR-01): RESUELTO** (`ADR-0009`). JWT real en el backend; el
   frontend usa sesión real con access token en memoria, **sin refresh** (Q15-B).
2. **CORS (FR-02): RESUELTO.** Si el frontend se despliega en otro dominio, hay que
   declararlo en el backend (no hay comodín).
3. **Matriz de permisos por rol: RESUELTA** (`ADR-0011`/`ADR-0013`/`ADR-0014`).
   5 roles, 44 endpoints; módulos en `Frontend-Role-Modules.md`.
4. **Listados de sólo lectura: RESUELTO** (`ADR-0017`). 5 endpoints de colección.
5. **Q19 — catálogo anónimo para SEO: ABIERTO (FR-08).** El Owner fijó el objetivo
   (catálogo sin sesión, login al *Comprar*, SEO en el Buyer) pero **aplazó la ejecución**.
   Exige una excepción nueva a **RG-01**, que sólo el Owner puede dictar. Hasta entonces,
   la spec ya contempla las rutas públicas, pero el backend devuelve `401`.
6. **Q-27 — el catálogo no filtra `Status` (FR-09).** `01-endpoints.md:238` promete que un
   producto suspendido "deja de ser visible en búsquedas y no se puede agregar a carritos";
   ni `GetProductsQuery` ni `AddOrderItemCommand` lo cumplen. Reportado en
   `backendSDD/orchestrator-state.md` §9.1; **bloquea Q19**, porque abrir el catálogo sin
   corregirlo expondría productos suspendidos al público.

---

## 8. Registro de acciones

| Fecha | Acción | Resultado |
| --- | --- | --- |
| 2026-09-27 | Se eliminó el código de React previamente generado | `frontend/` conserva sólo configuración base |
| 2026-09-27 | Se migraron 151 referencias de `SDD/` a `backendSDD/` | 27 archivos actualizados, 0 referencias rotas |
| 2026-09-27 | Se detectó contradicción entre el prompt de orquestación recibido y el dominio de Zentric | Registrada en la sección 3; no se implementó dominio bancario |
| 2026-10-09 | Grill de diseño Q1–Q14 con el Owner | Decisiones registradas en §1.2; `Frontend-SDD.md` actualizado (v1.9.0) |
| 2026-10-09 | Freno de mano Q15–Q20 contra el código real del backend | Rectificado Q12 (sin refresh, §1.3); Q16/Q17/Q18 cerrados; Q19 registrada y aplazada (§1.4); defecto Q-27 reportado (§1.4.1). v1.12.0 |
| 2026-10-10 | **F1: monorepo Turborepo + pnpm implementado** (Q16-A/Q17/Q18) | `frontend/apps/frontend` + `packages/ui` + `packages/config`; tokens Q7/Q8 en `@theme` de Tailwind v4, logo Q6 en SVG propio, router Q11 con registro de tipos; `lint`/`typecheck`/`build`/`test` en verde (27 tests); `Dockerfile` e `ci.yml` migrados a pnpm; build Docker verificado. **Falta la base shadcn/ui (Q14)** para cerrar F1. v1.13.0 |
| 2026-10-10 | **F1 cerrado: base shadcn/ui (Q14) instalada y ADAPTADA** + 4 fallos corregidos | 13 componentes (`button input select textarea checkbox card table dialog alert-dialog alert skeleton label badge`) en `packages/ui/src/components/ui`, test de humo (15 tests). **Correcciones:** (1) `.gitignore` NuGet `**/[Pp]ackages/*` excluía `frontend/packages/` — el commit F1 no contenía **0** ficheros del design system; (2) el CLI de shadcn añadía un `@theme inline` que anulaba Q7/Q8 con neutros e Inter; (3) dependencias falsas (`cn@0.4` homónimo, `shadcn` como dep de ejecución, Inter); (4) Geist no instalado y familia mal nombrada (`'Geist Variable'`, no `'Geist Sans Variable'`). `shadcn/tailwind.css` **vendorizado** (MIT): la CLI arrastraba 237 deps por un CSS de 16 KB. Anclado `--ring`→`--color-brand` (§5). v1.14.0 |
| 2026-10-10 | **F2a: capa de dominio del cliente** (`domain/`) trascrita del contrato verificado del backend (Q15) | 8 enums como literales de texto (ADR-0012) **testeados contra los valores reales** (red de seguridad del bug histórico `Seller:1, Buyer:2, Admin:3`); 11 modelos campo a campo (`Guid`→`string`, enums→uniones); 3 puertos (`ZentricApiPort` **26 métodos**, `SessionPort`, `AlertPort`); `ApiError` (§5). **Specs corregidas por Q15:** `createProduct` devuelve `CreatedProduct` (CAT-01 entrega `productId`+`variantIds`, mitiga FR-03) y sale de la lista `readGuid` §3.1; `createCart()` sin `buyerId` (Q-21b); puerto expandido de 18→26 métodos (los servicios §2 exigen `login`, `currentUser`, `publishProduct`, `listInventoryByVariant`, `getInvoicesByOrder`, `cancelGhostStock`, `inspectReturn`, `approveReturn`); ningún `*Input` lleva identidad (Q-21b); `ReturnStatus` usa `Requested`, no la prosa "Solicitada". Commit `b092301`. v1.15.0 |
| 2026-10-10 | **F2b: capa de aplicación del cliente** (`application/`) — casos de uso, esquemas y reglas de presentación | 26 servicios delgados en 8 ficheros por contexto (§2.1–§3), cada uno orquestando sólo puertos; `ProductoRegistrado` (`dto/`); 7 esquemas Zod (Q13) **anclados por tipo al `*Input` del puerto** (`z.ZodType<T, T>`), de modo que una divergencia entre formulario y contrato deja de compilar; validación sólo estructural —las reglas de negocio las impone el servidor (§1). **Reglas de presentación** `esPedidoModificable` y `admiteDevolucion` en `domain/rules/`, verificadas contra `backendSDD/Domain/07-lifecycle.md`. **Dos correcciones de specs por el contrato real:** (1) el puerto `listProducts()` no exponía el `vendorId` opcional que exige §2.2 y que `GET /api/catalog/products?vendorId=` sí acepta (Q-27); (2) `Frontend-Architecture.md` §3 no declaraba `domain/rules/`, pese a que `C4-4` dice que las reglas de presentación viven en el dominio. **Defecto residual de F1 corregido:** `apps/frontend/package.json` seguía arrastrando `cn@0.4.0` (el compilador homónimo, no la utilidad `cn()`); añadido `zod@4.6.5` pineado. v1.16.0 |
| 2026-10-10 | **F2c/F3: adaptador HTTP y sesión en memoria del cliente** (`adapters/`) | `ZentricHttpClient` implementa los 26 métodos de `ZentricApiPort` como único punto de contacto con la red: cabeceras fijas, `Authorization: Bearer` salvo en `login` y `health` (§1), 15 s con `AbortController` y **un** reintento sólo ante `5xx` o error de red, nunca ante `4xx`. `toApiError` cubre **ambos** envoltorios del backend y sigue el orden de §3.4 (`detail` → `title` → `errors` aplanado → genérico), conservando el `traceId` (R-05). `readGuid` (§3.1) aplicado a los seis endpoints de creación; `createProduct` desenvuelve `CreatedProduct` y **`approveReturn` envía el id también en el cuerpo**, verificado contra `backendSDD/Presentation/01-endpoints.md:277` (`ApproveReturnCommand`). `InMemorySession` guarda el token **sólo en memoria** — test que afirma que `localStorage` queda vacío —, `restore()` no prolonga la vida del token y `403` no cierra la sesión. La fábrica `createApiClient()` compone ambos lados para romper el ciclo sesión→cliente→sesión. v1.17.0 |
| 2026-10-10 | **Verificación end-to-end del adaptador contra el backend real** — y tres errores de contrato que sólo se veían en ejecución | Se levantó `docker compose` con **volumen limpio** (postgres 16.15 + api en 5076; el puerto 5432 del host ya estaba ocupado por otro PostgreSQL, así que `db` se remapeó a 15432 en un override temporal fuera del repo) y se ejecutaron **24 pruebas** que recorren el flujo completo con el `ZentricHttpClient` de producción: autenticación → catálogo → inventario → pedidos → facturación → logística → devoluciones, con los cuatro roles. **Hallazgos, todos corregidos en código y specs:** (1) `checkout`, `pay` y `dispatch` devuelven `200 OK` **sin cuerpo** (`return Ok();` en los controladores), pero el puerto y los servicios prometían `Promise<boolean>` — el adaptador devolvía `undefined`; pasan a `void` y la interfaz relee el estado si lo necesita (nueva §3.5 de `Frontend-Adapters`). (2) El puerto **no exponía `packFulfillment`**: el despacho nace en `PendingPack` y *"Dispatch sin haber empaquetado lanza excepción"* (`backendSDD/Domain/07-lifecycle.md`), de modo que la UI jamás habría podido despachar. (3) Tampoco exponía `deliverFulfillment`, el cierre que sólo puede hacer el Operador Logístico (Q-23) — el enum `FulfillmentStatus` del cliente ya modelaba los cinco estados, pero no había forma de transitarlos. Puerto de **26 a 28 métodos**; nuevos servicios `EmpacarService` y `EntregarService`. **El alta de producto deja el producto ya `Published`**, no un borrador. v1.18.0 |
| 2026-10-10 | **F4a: módulo público y guardas de rol** (`modules/public/`, `app/routes/`, `app/providers/`) | Se resuelve primero la ambigüedad que bloqueaba F4: **cuatro módulos reclamaban la ruta `/`** (admin, seller, buyer y logistics) y TanStack Router no admite cuatro componentes en la misma ruta — decisión del Owner, **`/` despacha por rol**, sin cambiar las specs. Implementados `/entrar` (login con correo y contraseña por ADR-0009, no selector de rol) y `/salud` (diagnóstico **público**: es al sitio al que se acude cuando se sospecha que el backend no responde, así que exigirle sesión impediría averiguar por qué no la hay), con `AuthProvider`/`useAuth()` de C4-4 §3 y guardas `beforeLoad` de §3 —sin sesión redirige a `/entrar?aviso=sin-sesion` para que la pantalla pueda explicar por qué apareció; con el rol equivocado pinta un `403` que **conserva** la sesión, igual que el servidor—. **Cuatro defectos hallados y corregidos en código y specs:** (1) el adaptador **ignoraba el `401`**, que §4 exige que limpie la sesión —sólo a quien llevaba token, porque un `401` de un `login` fallido no es una sesión perdida, son credenciales que no valían—; (2) el tema declaraba `--color-warning`/`--color-info`/`--color-success` (Q7/Q8) pero **ningún componente los expresaba**, y F4 necesita estados semánticos en todos los módulos: añadidas las variantes a `Badge` y `Alert`; (3) §2 de `Frontend-Architecture` no permitía a `modules/` importar `app/providers`, contradiciendo el arco `modules → providers` de C4-3 y el `useAuth()` que C4-4 §3 prescribe — corregido citando ambos documentos; (4) la tabla de rutas del Vendedor estaba **huérfana tras §5** mientras su sección seguía diciendo "sin diseñar", y la tabla de §2.1 seguía describiendo `/entrar` como "selección de rol" pese al ADDENDUM que lo corrigió. **Árbol de §3 alineado con el código:** `src/layouts/` en lugar de `src/app/layouts/`, y eliminado `src/lib/utils.ts` (re-export muerto, sin importadores). Q13 exigía React Hook Form + Zod pero **la dependencia nunca se había instalado**: no existía ningún formulario antes de F4. Verificado contra el backend vivo: el acceso completo funciona y, por el contrato Q15-B, **recargar la página pierde la sesión**. v1.19.0 |

| 2026-10-11 | **F4b: módulo del Administrador** (`modules/admin/`, consola autenticada, `/` despacha por rol) | **Estructura.** Una ruta sin `path` (`_console`) exige sesión en su `beforeLoad` y monta `ConsoleLayout`; todas las pantallas internas cuelgan de ella y cada una añade `exigirRol(Administrator)`, de modo que la sesión se pide una sola vez y el `403` de un rol ajeno se pinta **dentro** del armazón. El panel de `/` despacha por rol (F4-Q1). Cinco pantallas de §2.2: panel general (cuatro indicadores con esqueleto, vacío y reintento), usuarios (listado y alta), bodegas (listado y alta), bandeja de reembolsos y emisión de facturas. **Cómo se evitó inventar:** (1) `/devoluciones` es **reembolso**, no aprobación —`POST /approve` es del Vendedor y responde `403` (`ADR-0006`, Q-24)—, el botón se ofrece sólo sobre una devolución `Aprobada` y la confirmación nombra el pedido afectado (§5); (2) la emisión de facturas **no** pide confirmación —`Frontend-User-Flows` la pide para *Finalizar compra* y *Pagar*, no para emitir, y `Frontend-Adapters` §5 la reserva a lo financiero o destructivo— y la página muestra las facturas ya emitidas y deshabilita el botón, en lugar de ofrecer una acción que el servidor rechazaría con `400`; (3) el alta de un Vendedor muestra su identificador y enlaza el alta de su bodega, siguiendo `ZENTRIC.md` §6.1 ("el Administrador registra al vendedor y su primera bodega"); (4) el alta de bodega pide el dueño **sólo** para una bodega de vendedor y lo limpia al pasar a Marketplace, con el `.refine` del esquema anclado a `vendorId`. **Rótulos y navegación:** los enums se traducen en `components/domainLabels.ts` (`Record<Enum, string>` exhaustivo, §3 del Design System) porque los módulos no importan `domain/` (§2 de `Frontend-Architecture`); la navegación se declara `as const satisfies` con literales, así que **un enlace a una ruta inexistente no compila** (no hay enlaces muertos) y sólo lista las filas de §4 cuyo módulo ya existe. **Puerto de 28 a 30 métodos** (`listReturns`, `refundReturn`). **Tres defectos corregidos:** (1) `StatusBadge` de `@zentric/ui` no compilaba al ser alcanzable desde la app —`tone` admite `null` y se indexaba un `Record` sin esa clave—; (2) `AdminPanelPage` ofrecía un enlace muerto a `/productos/nuevo`, ruta del Vendedor que llega con F4c; (3) el `.refine` de `RegistrarBodegaSchema` no anclaba el error a `vendorId`, así que el formulario nunca mostraba el aviso. Añadido `@testing-library/user-event` y los stubs de `ResizeObserver`/captura de puntero en `vitest.setup.ts`: sin ellos el `Select` de Radix no se puede operar en jsdom. **Verificado en vivo** contra el backend real: acceso del Administrador, panel con datos reales, listados de usuarios/bodegas/devoluciones, diálogo de confirmación del reembolso (cancelado, sin mover dinero), `refundReturn` sobre una devolución aprobada (`200` sin cuerpo → `Refunded`) y emisión deshabilitada en un pedido ya facturado. v1.20.0 |
| 2026-10-12 | **F4c: módulo del Vendedor** (`modules/seller/`) | Panel de vendedor, gestión y alta de productos con variantes (CAT-01, CAT-03), suspensión/publicación reactiva y consulta/ajuste de inventario en bodegas autorizadas (INV-01, ADR-0005). v1.21.0 |
| 2026-10-12 | **F4d: módulo del Comprador** (`modules/buyer/`) | Catálogo público (Q19), carrito de compras con reserva de 15 minutos (PED-01), checkout atómico, historial de pedidos con filtro reactivo e inmutabilidad tras `Paid`. v1.22.0 |
| 2026-10-12 | **F4e: módulo del Operador Logístico** (`modules/logistics/`) | Panel logístico con indicadores, cola de empaque, despacho y entrega (`FulfillmentStatus`), reporte de stock fantasma / quiebre (`cancelGhostStock`, ADR-0014) e inspección física de devoluciones en bodega (`inspectReturn`, Q-24). v1.23.0 |

---

## 9. Comandos de referencia

```powershell
# Backend
cd backend; dotnet build Zentric.slnx
cd backend; dotnet test  Zentric.slnx

# Frontend (monorepo, desde frontend/)
pnpm install
pnpm dev          # turbo run dev
pnpm build        # turbo run build
pnpm typecheck    # turbo run typecheck
pnpm test         # turbo run test
pnpm lint         # turbo run lint
```

---

## 10. Criterio de terminado (DoD)

- [ ] `frontend/` contiene todo el código de cliente y su `README.md`.
- [ ] Cada endpoint del backend tiene mapeo en el cliente o exclusión explícita.
- [ ] Cada rol tiene módulo protegido y comportamiento de panel definido.
- [ ] Estados de carga, vacío, error y éxito presentes en todas las vistas.
- [ ] Accesibilidad verificada: foco, teclado, contraste, movimiento reducido.
- [ ] Pruebas de adaptadores, servicios y guardas en verde.
- [ ] `pnpm build` sin errores de TypeScript.
- [ ] `frontend/Dockerfile` construye y sirve la aplicación.
- [ ] Sin reglas de negocio implementadas en el cliente.
- [ ] Sin dominio ajeno (bancario) incorporado.
- [ ] Decisiones Q1–Q20 aplicadas (stack, tokens, logo, sesión, formularios, monorepo, pnpm, Tailwind v4).
- [ ] **Q19 sin ejecutar a ciegas:** cualquier cambio de rutas públicas espera el `[ADDENDUM - DICTADO POR OWNER]` de RG-01.
