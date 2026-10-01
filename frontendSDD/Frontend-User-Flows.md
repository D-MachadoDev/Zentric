# Frontend-User-Flows

> Recorridos observables que el usuario debe poder completar. Cada flujo define
> lo que se **ve**, no sólo las peticiones HTTP.
> Derivan de [`../ZENTRIC.md`](../ZENTRIC.md) y de
> [`Frontend-Role-Modules.md`](Frontend-Role-Modules.md).

---

## 1. Reglas comunes a todos los flujos

| # | Comportamiento obligatorio |
| --- | --- |
| 1 | Nunca hay pantalla en blanco: mientras cargan los datos hay esqueleto. |
| 2 | Toda mutación deshabilita su botón y muestra estado `aria-busy`. |
| 3 | Los errores del servidor se muestran; nunca se tragan. |
| 4 | Las acciones financieras o destructivas exigen confirmación. |
| 5 | Las colecciones vacías explican la siguiente acción útil. |
| 6 | El `404` produce un estado vacío contextual, no un error global. |
| 7 | `401` limpia la sesión y vuelve a la entrada con aviso de expiración. |
| 8 | `403` conserva la sesión y muestra aviso de permiso insuficiente. |
| 9 | `409` explica el conflicto y **conserva lo escrito** en el formulario. |
| 10 | Cada vista tiene título visible y ruta activa resaltada. |

---

## 2. Flujo de entrada

```text
1. El usuario abre la aplicación.
2. Ve la pantalla de entrada con marca, selector de rol y campo de usuario.
3. Elige su rol (Administrador, Vendedor, Comprador u Operador logístico).
4. Pulsa "Ingresar".
5. Mientras resuelve, el botón queda deshabilitado con estado ocupado.
6. Se muestra una transición breve; NO hay pantalla vacía.
7. Aparece el panel del rol, con sus tarjetas en esqueleto y luego con datos.
```

**Observables:** esqueleto durante la carga · ruta activa resaltada · nombre del
rol visible en el encabezado · acción de cierre de sesión.

> **Cambio de flujo (`ADR-0009`, 2026-09-28):** la pantalla de acceso **sí valida
> credenciales** ahora. El flujo correcto es: `POST /api/auth/login` con correo y
> contraseña → `200` guarda el token → `401` muestra el error y no entra. Reemplaza la
> selección de rol por credenciales reales.

---

## 3. Flujo de alta de usuario (Administrador)

```text
1. Administrador → Usuarios → "Registrar usuario".
2. Completa documento de identidad, nombre, correo, contraseña y rol.
3. El campo de rol es un único selector: un usuario, un solo rol (RG-02).
4. Validación local de formato: campos obligatorios y correo con arroba.
5. Envío → botón deshabilitado con estado ocupado.
6a. Éxito → confirmación con el identificador; la tabla se actualiza.
6b. Duplicado (400) → el error se muestra junto al campo y **se conserva lo escrito**.
```

---

## 4. Flujo de alta de producto e inventario (Vendedor)

```text
1. Vendedor → Productos → "Registrar producto".
2. Completa nombre, descripción, precio, moneda y tipo (Físico o Digital).
3. Si es Físico, el formulario exige al menos una variante con SKU (ADR-0003).
4. Envío → se crea el producto y el servidor devuelve el productId.
5. La interfaz relee el producto y muestra el SKU y el variantId.
6. El vendedor usa ese variantId para ingresar existencias.
7. Inventario → selecciona bodega y cantidad mayor que cero → "Ingresar existencias".
8. La lista muestra disponible, reservado y dañado por separado.
```

**Observables:** tras el alta se ve el `variantId` (clave real de inventario) ·
un producto digital no pide variante · una cantidad cero o negativa se rechaza
antes de enviar.

---

## 5. Flujo de compra (Comprador) — el camino crítico

```text
1. Comprador → Catálogo → elige un producto.
2. Se abre el detalle con sus variantes y el precio del servidor.
3. "Agregar al carrito": el cliente crea el carrito si no existe y añade la línea
   usando el variantId.
4. Carrito → muestra líneas, cantidades y total con la moneda del servidor.
5. "Finalizar compra" pide confirmación.
6. Checkout → el servidor reserva inventario y mueve el pedido a
   "Pendiente de Pago".
7. La interfaz muestra el estado devuelto; no lo anticipa ni lo recalcula.
8. "Pagar" pide confirmación y mueve el pedido a "Pagado".
9. "Emitir facturas" genera Factura Maestra y Detalle Zentric.
10. Desde aquí el pedido se muestra como inmutable.
```

**Observables:** el total se muestra siempre con la moneda del servidor · el botón
de pagar se deshabilita si el estado no lo permite · tras el checkout se ven la
disponibilidad y la reserva actualizadas · el pedido pagado no ofrece edición.

**Prueba ejecutada contra la API real:** el recorrido 1→9 se completó y se

---

## 6. Flujo de despacho (Operador logístico)

```text
1. Operador → Despachos.
2. Ve los despachos pendientes de empaque.
3. "Empaquetar" → el estado pasa a Empacado.
4. "Despachar" pide confirmación nombrando el pedido y la bodega.
5. El estado pasa a Despachado.
6. Si hay quiebre de stock, la cancelación exige confirmación y genera
   la devolución obligatoria (ADDENDUM Dominio 8).
```

---

## 7. Flujo de devolución

```text
1. Comprador o Administrador → Devoluciones → "Solicitar devolución".
2. Si el producto es Digital, la acción NO aparece (prohibido por la Ley).
3. Se indica variante, bodega y cantidad.
4. El Operador logístico inspecciona e indica si está en buen estado.
5. Si es físico y en buen estado, el Vendedor o el Administrador aprueba.
6. El producto vuelve al stock con la etiqueta Usado.
```

---

## 8. Matriz de estados de UI por vista

| Vista | Carga | Vacío | Error | Éxito |
| --- | --- | --- | --- | --- |
| Panel | Tarjetas en esqueleto | "Sin datos aún" + acción | Mensaje + reintento | Indicadores + acciones |
| Catálogo | Filas esqueleto | "No hay productos" + registrar | Mensaje + reintento | Tabla de productos |
| Carrito | Esqueleto | "Carrito vacío" + explorar catálogo | Mensaje + reintento | Líneas + total + checkout |
| Pedido | Esqueleto | "Pedido no encontrado" | Mensaje + reintento | Detalle + acciones según estado |
| Bodegas | Esqueleto | "Sin bodegas" + registrar | Mensaje + reintento | Tabla de bodegas |
| Despachos | Esqueleto | "Sin despachos" | Bloqueado por R-03 | Tabla de despachos |

---

## 9. Pruebas de recorrido exigidas

| Recorrido | Tipo de prueba |
| --- | --- |
| Entrada → panel del rol | Integración con guardas |
| Alta de usuario | Integración del módulo |
| Alta de producto → variante → stock | Integración, cubre FR-03 |
| Compra completa hasta factura | Integración contra la API real |
| Confirmación de pago | Unitaria del diálogo |
| Devolución de producto digital: acción ausente | Unitaria de renderizado |
| `401` limpia sesión y redirige | Unitaria del adaptador |
| `403` conserva sesión | Unitaria de la guarda |

verificó en PostgreSQL que el pedido pasa a `Pendiente de Pago`, que el stock
pasa de 50 a 48 disponibles con 2 reservados, que se genera la orden de despacho
y que las facturas quedan registradas (36.000 ARS maestra + 1.800 ARS de detalle).
