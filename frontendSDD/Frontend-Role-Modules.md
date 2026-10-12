# Frontend-Role-Modules

> Módulos del cliente según los roles definidos en
> [`../ZENTRIC.md`](../ZENTRIC.md#12-matriz-de-responsabilidades) (Matriz de Responsabilidades) y RG-02.
>
> **Los roles son cinco:** Administrador, Vendedor, Comprador, Operador
> logístico y **Supervisor**. Los nombres de rol del prompt de orquestación recibido
> (`natural-customer`, `teller`, `commercial`, `internal-analyst`) no existen en
> esta Ley y no se usan.
>
> `[ADDENDUM - DICTADO POR OWNER, 2026-09-29]` Este documento declaraba **cuatro**
> roles y omitía al Supervisor, que `ZENTRIC.md` §5 sí define y que el backend
> implementa como perfil de **consulta y seguimiento operativo**: puede leer
> pedidos, despachos, devoluciones y facturas, y no puede escribir en ninguna
> parte. La omisión era de este documento, no de la Ley. El Supervisor **no tiene
> módulo propio**: usa las pantallas compartidas de solo lectura (§2.6). Ver
> `backendSDD/Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md`.

---

## 1. Matriz de responsabilidades (de la Ley)

| Proceso | Comprador | Vendedor | Op. Logístico | Admin |
| --- | :---: | :---: | :---: | :---: |
| Registro de Vendedores | | | | ✔ |
| Registro de Productos | | ✔ | | |
| Administración de Inventario | | ✔ | ✔ | |
| Gestión de Pedidos | ✔ | ✔ | ✔ | |
| Gestión de Reembolsos | ✔ | | | ✔ |

`[INFERIDO]` De esta matriz se derivan los módulos. "✔" significa que el actor
**opera** el proceso, no que tenga acceso total. RG-03 impide a cualquier
participante administrar información fuera de su rol.

---

## 2. Módulos

### 2.1 `modules/public/` — Entrada

| Ruta | Contenido | Visible para |
| --- | --- | --- |
| `/entrar` | Acceso con correo y contraseña (ADR-0009) | Todos |
| `/salud` | Estado del servidor | Todos |

No requiere sesión. Es la única puerta de entrada al sistema.

> **Resuelto (ADR-0009, 2026-09-28):** el backend **sí valida credenciales**. La pantalla
> de acceso llama a `POST /api/auth/login`; si devuelve `401` no entra. Ya no es
> `PROVISIONAL`: el frontend debe reemplazar la selección de rol por un login con
> correo y contraseña, y guardar el token devuelto.

### 2.2 `modules/admin/` — Administrador

| Ruta | Contenido | Endpoints |
| --- | --- | --- |
| `/` | Panel general | `GET /health`, `GET /api/Users`, `GET /api/Warehouses`, `GET /api/Catalog/products` |
| `/usuarios` | Listado de usuarios | `GET /api/Users` |
| `/usuarios/nuevo` | Alta de usuario | `POST /api/Users` |
| `/bodegas` | Listado de bodegas | `GET /api/Warehouses` |
| `/bodegas/nueva` | Alta de bodega | `POST /api/Warehouses` |
| `/devoluciones` | Bandeja de reembolsos | `GET /api/Returns`, `POST /api/Returns/{id}/refund` |

> **Reembolso, no aprobación (Q-24).** `POST /api/Returns/{id}/approve` es
> **sólo del Vendedor**: la política `ReturnApprove` no incluye al Administrador
> y quien lo invoca desde este rol recibe `403`
> ([`backendSDD/Presentation/02-authorization.md`](../backendSDD/Presentation/02-authorization.md) §3 y §5).
> El ADDENDUM Dominio 10 dice que la aprobación de la devolución "requiere la
> aprobación del Vendedor", y [ADR-0006](../backendSDD/Adr/0006-resolucion-contradiccion-ley-addendum.md)
> le dio la última palabra. El poder de esta pantalla es el **reembolso**:
> `POST /api/Returns/{id}/refund` (política `ReturnRefund`, **sólo
> Administrador**, [Q-24](../backendSDD/Presentation/02-authorization.md)) acredita
> el dinero al comprador, que es lo que la tabla de §4 ya rotulaba
> "(reembolso)". El listado que alimenta la bandeja es `GET /api/Returns`
> (política `ReturnRead`, los cinco roles — `ADR-0017`), y el reembolso sólo
> cabe sobre una devolución **ya aprobada**: el botón se ofrece únicamente en
> ese estado.

**Facturación** (`[ADDENDUM - DICTADO POR OWNER, 2026-09-29]`, antes estaba en el
módulo del Comprador): la emisión de facturas es un acto de la plataforma —el
backend emite la Factura Maestra, el Detalle Zentric con la comisión y una factura
por vendedor—, así que el botón vive aquí y **solo** el Administrador puede
pulsarlo. El endpoint además rechaza un pedido no pagado y un pedido ya
facturado.

| Ruta | Contenido | Endpoints |
| --- | --- | --- |
| `/pedidos/:id/facturar` | Emisión de las facturas del pedido | `POST /api/Billing/invoices/generate/{orderId}` |

**Panel:** cuatro indicadores (usuarios, bodegas, productos, estado de la base) con
esqueleto de carga, estado vacío y reintento.

### 2.3 `modules/seller/` — Vendedor

> Q-02 fijó que existe un *Seller Dashboard*. La gestión del catálogo propio es lo que
> este módulo debe consumir del backend:
>
> | Ruta backend | Qué resuelve |
> | --- | --- |
> | `GET /api/Catalog/products?vendorId={id propio}` | **Único listado que muestra también los `Suspended` y `Discontinued`.** Para cualquier otro `vendorId`, o sin filtro, devuelve sólo `Published` (Q-27, dictamen Q22 = B). |
> | `POST /api/Catalog/products` | Alta de producto. Nace `Published` (auto-publicación, CAT-01). |
> | `POST /api/Catalog/products/{id}/publish` | Reactiva un `Suspended` (Q-25). |
> | `POST /api/Catalog/products/{id}/suspend` | Suspende: el producto sale del catálogo comercial y el carrito lo rechaza (Q-27). |
>
> El `vendorId` propio no lo elige el cliente: lo deriva el backend de la identidad del token y lo
> compara con el `vendorId` pedido. Por eso un Vendedor **no puede** pedir los estados de otro
> vendedor — recibe sólo lo publicado, igual que cualquiera.

| Ruta | Contenido | Endpoints |
| --- | --- | --- |
| `/` | Panel del vendedor: sus productos | `GET /api/Catalog/products?vendorId=` |
| `/productos/nuevo` | Alta de producto con variante | `POST /api/Catalog/products` |
| `/productos/:id` | Detalle, publicación y suspensión | `GET /api/Catalog/products/{id}`, `POST /publish`, `POST /suspend` |
| `/inventario` | Carga y consulta de existencias | `POST /api/Inventories/stock`, `GET /api/Warehouses`, `GET /api/Inventories/{variantId}` |

**Reglas de UI aplicadas:**
- Un producto `Physical` exige al menos una variante (ADR-0003).
- Tras crear el producto, la UI muestra el **SKU y el `variantId`** para que el
  vendedor pueda usarlo en el inventario.
- La cantidad de stock debe ser mayor que cero (INV-01: no hay existencias negativas).

### 2.4 `modules/buyer/` — Comprador

| Ruta | Contenido | Endpoints |
| --- | --- | --- |
| `/` | Panel del comprador | `GET /api/Catalog/products` |
| `/catalogo` | Catálogo con variantes | `GET /api/Catalog/products` |
| `/carrito` | Carrito y checkout | `POST /api/Orders/cart`, `POST /cart/items`, `POST /checkout` |
| `/pedidos/:id` | Detalle y pago | `GET /api/Orders/{id}`, `POST /pay` |

> `[ADDENDUM - DICTADO POR OWNER, 2026-09-29]` Esta fila incluía
> `POST /api/Billing/invoices/generate`, que devolvía `403` a este rol: el
> comprador no emite sus propias facturas. Ese endpoint se movió al módulo del
> **Administrador** (§2.2).

> `[Q19 — APLAZADA, 2026-10-09]` El Owner fijó que **`/catalogo` debe poder
> navegarse sin sesión** y que el login se pida **al pulsar *Comprar***, porque
> ahí es donde se juega el SEO del Buyer. **La ejecución queda aplazada**: exige
> una excepción nueva a **RG-01** que sólo el Owner puede dictar como
> `[ADDENDUM - DICTADO POR OWNER]`, y previamente hay que cerrar **Q-27**
> (el catálogo hoy no filtra `Status`, así que se expondrían productos
> suspendidos). **Mientras tanto:** `/catalogo` se diseña como ruta **pública**
> en el router —el `beforeLoad` **no** exige sesión— y el guard se pone en el
> botón *Comprar*, que redirige a login guardando el retorno. El adaptador
> **no** asume anonimato: consume `GET /api/Catalog/products` tal cual, que
> sigue exigiendo token hasta que exista el ADDENDUM. Ver
> [`Frontend-SDD.md` §1.4](Frontend-SDD.md#14-q19--seo-del-catálogo-decisión-registrada-ejecución-aplazada).

**Reglas de UI aplicadas:**
- El checkout **no** replica la reserva: la muestra después de la respuesta.
- El botón de pagar se deshabilita si el pedido no está en `Pendiente de Pago`.
- Un pedido `Pagado` o posterior se muestra como **inmutable** (Validación crítica).
- El total se formatea con la moneda que devuelve el servidor; nunca se recalcula
  en el cliente como fuente de verdad.

### 2.5 `modules/logistics/` — Operador logístico

| Ruta | Contenido | Endpoints |
| --- | --- | --- |
| `/` | Panel de despachos | `GET /api/Logistics/fulfillment` (bloqueado por R-03) |
| `/despachos/:id` | Detalle y despacho | `POST /api/Logistics/fulfillment/{id}/dispatch` |
| `/despachos/:id/quiebre` | Reporte de quiebre de stock | `POST /api/Logistics/fulfillment/cancel-ghost-stock` |
| `/devoluciones` | Inspección de devoluciones | `POST /api/Returns/{id}/inspect` |

> `[ADDENDUM - DICTADO POR OWNER, 2026-09-29]` El reporte de quiebre estaba
> documentado en las reglas de UI pero devolvía `403` a este rol: solo el
> Vendedor podía ejecutarlo, y el Vendedor no está en la bodega. Ahora el
> Operador puede reportarlo, porque es quien encuentra el faltante. La
> cancelación no es silenciosa: genera la devolución obligatoria y el crédito
> al comprador. Ver `backendSDD/Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md`.

**Reglas de UI aplicadas:**
- La cancelación por quiebre de stock requiere confirmación explícita
  (ADDENDUM Dominio 8: stock fantasma).
- La inspección registra si el producto está en buen estado; sin esa respuesta no
  se puede continuar.

### 2.6 `modules/shared-modules/` — Visible para varios roles

| Ruta | Roles | Contenido |
| --- | --- | --- |
| `/pedidos/:id` | Todos | Detalle del pedido, sólo lectura |
| `/devoluciones/nueva` | Comprador, Admin | Solicitud de devolución |
| `/configuracion` | Todos | Preferencias de sesión y cierre |

> **Supervisor.** `[ADDENDUM - DICTADO POR OWNER, 2026-09-29]` Es el quinto rol y
> no tiene módulo propio: entra por estas pantallas compartidas, todas de solo
> lectura. El backend le permite leer pedidos, despachos, devoluciones y
> facturas, y ninguna escritura. Si en el futuro quiere un panel propio, hará
> falta un endpoint de **listado** de pedidos o despachos, que hoy no existe
> (R-03: solo hay detalle por identificador).

**Prohibición en la UI (ADDENDUM Dominio 10):** si el producto es `Digital`, la
opción de solicitar devolución **no se muestra**. No es una validación: es la
ausencia de la acción, porque está prohibida por la Ley.

---

## 3. Guardas de acceso (Q11 — TanStack Router)

Con **TanStack Router**, la guarda vive en el `beforeLoad` de la ruta, no en un
componente envoltorio: si el rol no corresponde, la ruta ni se resuelve.

```ts
// app/routes/_seller.tsx
// Guarda de rol en beforeLoad: se ejecuta antes de hidratar el módulo.
const sellerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/seller',
  beforeLoad: ({ context }) => {
    if (context.role !== UserRole.Seller) throw redirect({ to: '/entrar' });
  },
  component: SellerLayout,
});
```

| Situación | Resultado |
| --- | --- |
| Sin sesión | Redirección a `/entrar` con aviso |
| Rol no autorizado | Estado `403` con aviso; **la sesión se conserva** |
| Rol autorizado | Renderiza el módulo |

La navegación lateral se construye **filtrando por rol**, de modo que un usuario
nunca ve un enlace que le será denegado (RG-03).

**Implementación (F4b).** El armazón no se repite por rol: `app/routes` declara
**una** ruta sin `path` (`_console`, id explícito) cuyo `beforeLoad` ejecuta
`exigirSesion` y cuyo componente es `ConsoleLayout`; todas las pantallas internas
cuelgan de ella y cada una añade su `exigirRol`. Así la sesión se exige **una sola
vez** y ninguna ruta hija puede olvidarlo, y el `403` de un rol equivocado se
pinta **dentro** del armazón (no se pierde la consola). El panel de la raíz `/`
despacha por rol (`F4-Q1`), porque cuatro módulos reclaman `/` y TanStack Router
admite un único componente por ruta.

---

## 4. Navegación por rol

| Enlace | Administrador | Vendedor | Comprador | Op. logístico |
| --- | :---: | :---: | :---: | :---: |
| Panel | ✔ | ✔ | ✔ | ✔ |
| Catálogo | ✔ | ✔ | ✔ | ✔ |
| Productos | | ✔ (alta) | | |
| Inventario | ✔ (ajuste) | ✔ | | ✔ (consulta) |
| Bodegas | ✔ | | | |
| Usuarios | ✔ | | | |
| Carrito | | | ✔ | |
| Despachos | ✔ | | | ✔ |
| Devoluciones | ✔ (reembolso) | | ✔ (solicitud) | ✔ (inspección) |

> **Productos es alta sólo del Vendedor.** La fila daba al Administrador un
> "(alta)" que el backend deniega: `POST /api/catalog/products` exige la política
> `ProductManagement`, que sólo incluye al Vendedor, y al Administrador le
> responde `403` ([`backendSDD/Presentation/02-authorization.md`](../backendSDD/Presentation/02-authorization.md) §2).
> `ZENTRIC.md` §1 también le asigna *Registro de Productos* únicamente al
> Vendedor. Lo que el Administrador sí puede es leer el catálogo (§2.2).
>
> **Inventario del Administrador:** puede **ajustar** (`POST /api/Inventories/{id}/adjust`,
> `InventoryAdjust`) pero **no** leer el listado (`GET /api/Inventories` es de
> Vendedor y Operador); la fila ya no promete una consulta que responde `403`.

---

## 5. Autorización real en el servidor

`[CONFIRMADO]` R-01 está **cerrado** (`ADR-0009`): el backend emite JWT y aplica
**20 políticas** (`Zentric.Api/Security/AuthorizationPolicies.cs`), incluida
`InventoryAdjust`. Las guardas del cliente son de **presentación** (evitan
pantallas inútiles); la seguridad real la garantiza el servidor. Un `403` del
servidor siempre prevalece y la UI lo muestra sin cerrar la sesión.
