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
| `/entrar` | Selección de rol de trabajo | Todos |
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
| `/devoluciones` | Gestión de reembolsos | `POST /api/Returns/{id}/approve` |

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

## 3. Guardas de acceso

```ts
// app/guards/RequireRole.tsx
// Uso: <RequireRole roles={[UserRole.Admin]}><UsuariosPage /></RequireRole>
```

| Situación | Resultado |
| --- | --- |
| Sin sesión | Redirección a `/entrar` con aviso |
| Rol no autorizado | Estado `403` con aviso; **la sesión se conserva** |
| Rol autorizado | Renderiza el módulo |

La navegación lateral se construye **filtrando por rol**, de modo que un usuario
nunca ve un enlace que le será denegado (RG-03).

---

## 4. Navegación por rol

| Enlace | Administrador | Vendedor | Comprador | Op. logístico |
| --- | :---: | :---: | :---: | :---: |
| Panel | ✔ | ✔ | ✔ | ✔ |
| Catálogo | ✔ | ✔ | ✔ | ✔ |
| Productos | ✔ (alta) | ✔ (alta) | | |
| Inventario | ✔ | ✔ | | ✔ (consulta) |
| Bodegas | ✔ | | | |
| Usuarios | ✔ | | | |
| Carrito | | | ✔ | |
| Despachos | ✔ | | | ✔ |
| Devoluciones | ✔ (reembolso) | | ✔ (solicitud) | ✔ (inspección) |

---

## 5. Bloqueo conocido

`[OBSERVADO]` Sin autenticación ni matriz de permisos en el backend, estas guardas
son de **presentación**, no de seguridad real. El control efectivo depende de que
el backend aplique RG-01 a nivel de endpoint. Se registra como R-01.


| Ruta | Contenido | Endpoints |
| --- | --- | --- |
| `/` | Panel del vendedor | `GET /api/Catalog/products?vendorId=` |
| `/productos/nuevo` | Alta de producto con variante | `POST /api/Catalog/products` |
| `/productos/:id` | Detalle y publicación | `GET`, `POST /publish` |
| `/inventario` | Carga de existencias | `POST /api/Inventories/stock` |

**Reglas de UI aplicadas:**
- Un producto `Physical` exige al menos una variante (ADR-0003).
- Tras crear el producto, la UI muestra el **SKU y el `variantId`** para que el
  vendedor pueda usarlo en el inventario.
- La cantidad de stock debe ser mayor que cero (INV-01: no hay existencias negativas).
