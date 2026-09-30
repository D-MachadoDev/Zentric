# Capa de Presentación - Autorización por rol (matriz RG-03)

**Actualizado 2026-09-29. Cierra Q-21 / RG-03 con [ADR-0011](../Adr/0011-matriz-autorizacion-por-rol.md).**

Este documento es la SSoT de **quién puede llamar a qué**. Su equivalente ejecutable es
[`Zentric.Api/Security/AuthorizationPolicies.cs`](../../backend/Zentric.Api/Security/AuthorizationPolicies.cs):
ambos listados son la misma matriz y cambian juntos ([AGENTS.md, sección 0.2](../../AGENTS.md#02-regla-de-sincronización-bidireccional-spec-anchored-code)).

## 1. Reglas de operación

| # | Regla | Cómo se sostiene |
|---|---|---|
| 1 | **Todo endpoint exige token.** No existe ruta abierta por defecto | `FallbackPolicy = RequireAuthenticatedUser()` en `Program.cs`: una ruta que nadie decoró **no queda abierta**, queda denegada |
| 2 | **Anónimo solo donde la Ley lo exige** | `[AllowAnonymous]` aparece en dos acciones de controlador (`POST /api/auth/login` y `POST /api/users`, auto-registro de Compradores según ZENTRIC.md Dominio 3) y en la sonda `GET /health` |
| 3 | **Un solo lugar define los roles** | Los controladores citan constantes de `AuthorizationPolicies`; tienen prohibido escribir literales de rol. `Program.cs` recorre `RolesByPolicy` y registra sus políticas |
| 4 | **Rol equivocado = `403`** con `ProblemDetails` (RFC 9457); token ausente o inválido = `401` | Pipeline de autorización de ASP.NET Core + middleware de problemas ya registrado |
| 5 | **El rol viaja en el token** como claim de rol con la URI larga de `ClaimTypes.Role` (emitida por `JwtAuthTokenService`); `IsInRole` la resuelve | Verificado en Docker: un `Supervisor` recibe `403` donde solo entra `Administrator` |
| 6 | **Una política admite lista vacía**: `AnyAuthenticatedUser` la tiene vacía y basta identidad | `RolesByPolicy` |

**Etiquetas de evidencia** (las mismas del `SDD.md`): `[CONFIRMADO]` = lo dice la Ley o el
ADDENDUM; `[INFERIDO]` = la Ley no lo explicita y se deduce de una definición de rol (§5);
`[ABIERTO Q-21x]` = hace falta dictamen del Owner y mientras tanto la política es **fail-closed**
(el conjunto más chico que la Ley sostiene).

## 2. Matriz de políticas

| Política | Roles admitidos | Fundamento |
|---|---|---|
| `AnyAuthenticatedUser` | *(cualquiera autenticado)* | `[CONFIRMADO]` §6.1 paso 4: el catálogo es público entre participantes; RG-01 sigue exigiendo token |
| `UserAdministration` | Administrator | `[CONFIRMADO]` Dominio 3: los vendedores no se auto-registran; §12 "Registro Vendedores" solo al Admin |
| `WarehouseManagement` | Administrator | `[CONFIRMADO]` §5 y §6.1 paso 1: el Admin registra al vendedor y su primera bodega |
| `WarehouseRead` | Administrator, Seller, LogisticsOperator | `[INFERIDO]` §12 no tiene fila para bodegas; lo que se registra lo leen quien opera y quien despacha |
| `ProductManagement` | Seller | `[CONFIRMADO]` §12 "Registro Productos" con palomita solo en Vendedor |
| `InventoryManagement` | Seller, LogisticsOperator | `[CONFIRMADO]` §12 "Administración Inventario: Vendedor y Operador Logístico" |
| `InventoryRead` | Seller, LogisticsOperator | `[INFERIDO]` espejo de la escritura: quien administra el inventario lo lee |
| `Checkout` | Buyer | `[CONFIRMADO]` §5: el Comprador es quien adquiere productos |
| `OrderRead` | los cinco roles | `[CONFIRMADO]` §12 "Gestión de Pedidos" con palomita en los cinco |
| `FulfillmentOperate` | Seller, LogisticsOperator | `[CONFIRMADO]` ADDENDUM Dominio 8: el fulfillment deriva del pedido y se ejecuta en bodega |
| `FulfillmentCancelByQuiebre` | Seller | `[CONFIRMADO]` ADDENDUM Dominio 8 estado 5. `[ABIERTO Q-21c]`: en la práctica el faltante lo detecta el Operador en bodega |
| `FulfillmentRead` | los cinco roles | `[CONFIRMADO]` mismo fundamento que `OrderRead`: el número de guía interesa a todas las partes |
| `ReturnRequest` | Buyer | `[CONFIRMADO]` §12 "Gestión Reembolsos" en Comprador; ADDENDUM Dominio 10 abre el flujo con la solicitud |
| `ReturnInspect` | LogisticsOperator | `[CONFIRMADO]` ADDENDUM Dominio 10: "el operador logístico inspecciona" |
| `ReturnApprove` | Seller | `[CONFIRMADO]` ADDENDUM Dominio 10: la inspección favorable "requiere la aprobación del Vendedor". **El Admin no aprueba** ([ADR-0006](../Adr/0006-resolucion-contradiccion-ley-addendum.md) resuelve la colisión a favor del ADDENDUM) |
| `ReturnRead` | los cinco roles | `[CONFIRMADO]` + `[INFERIDO]` por "consulta y seguimiento operativo" (§5) |
| `BillingGenerate` | Administrator | `[ABIERTO Q-21d]` ADDENDUM Dominio 9 describe los tres documentos pero no dice quién los emite; la Matriz §12 da facturación solo al Admin |
| `BillingRead` | Buyer, Seller, Administrator, Supervisor | `[CONFIRMADO]` ADDENDUM Dominio 9 asigna un destinatario a cada documento; el Operador no factura ni consume factura |

## 3. Matriz por endpoint (30 acciones)

| Método | Endpoint | Política | Roles que entran |
|---|---|---|---|
| `POST` | `/api/auth/login` | *(anónimo)* | — |
| `GET` | `/api/auth/me` | `AnyAuthenticatedUser` | todos |
| `POST` | `/api/users` | *(anónimo con guarda en el controlador)* | anónimo solo si `role = Buyer`; cualquier otro rol exige token de Administrator |
| `GET` | `/api/users` | `UserAdministration` | Admin |
| `GET` | `/api/users/{id}` | `UserAdministration` | Admin |
| `POST` | `/api/warehouses` | `WarehouseManagement` | Admin |
| `GET` | `/api/warehouses` | `WarehouseRead` | Admin, Seller, Op. Logístico |
| `GET` | `/api/warehouses/{id}` | `WarehouseRead` | Admin, Seller, Op. Logístico |
| `POST` | `/api/catalog/products` | `ProductManagement` | Seller |
| `POST` | `/api/catalog/products/{productId}/publish` | `ProductManagement` | Seller |
| `GET` | `/api/catalog/products` | `AnyAuthenticatedUser` | todos |
| `GET` | `/api/catalog/products/paged` | `AnyAuthenticatedUser` | todos |
| `GET` | `/api/catalog/products/{id}` | `AnyAuthenticatedUser` | todos |
| `POST` | `/api/inventories/stock` | `InventoryManagement` | Seller, Op. Logístico |
| `GET` | `/api/inventories/{variantId}` | `InventoryRead` | Seller, Op. Logístico |
| `POST` | `/api/orders/cart` | `Checkout` | Buyer |
| `POST` | `/api/orders/cart/items` | `Checkout` | Buyer |
| `POST` | `/api/orders/{orderId}/checkout` | `Checkout` | Buyer |
| `POST` | `/api/orders/{orderId}/pay` | `Checkout` | Buyer |
| `GET` | `/api/orders/{id}` | `OrderRead` | los cinco *(+ comprobación de propiedad, §5)* |
| `POST` | `/api/logistics/fulfillment` | `FulfillmentOperate` | Seller, Op. Logístico |
| `POST` | `/api/logistics/fulfillment/{id}/dispatch` | `FulfillmentOperate` | Seller, Op. Logístico |
| `POST` | `/api/logistics/fulfillment/cancel-ghost-stock` | `FulfillmentCancelByQuiebre` | Seller |
| `GET` | `/api/logistics/fulfillment/{id}` | `FulfillmentRead` | los cinco |
| `POST` | `/api/returns/request` | `ReturnRequest` | Buyer |
| `POST` | `/api/returns/{id}/inspect` | `ReturnInspect` | Op. Logístico |
| `POST` | `/api/returns/{id}/approve` | `ReturnApprove` | Seller |
| `GET` | `/api/returns/{id}` | `ReturnRead` | los cinco |
| `POST` | `/api/billing/invoices/generate/{orderId}` | `BillingGenerate` | Admin |
| `GET` | `/api/billing/invoices/order/{orderId}` | `BillingRead` | Buyer, Seller, Admin, Supervisor |

`GET /health` no es acción de controlador pero **también queda cubierto por la `FallbackPolicy`**
(los endpoints mínimos participan de ella), así que su anonimato es explícito:
`.AllowAnonymous()` encadenado en `MapGet("/health", …)` (`Program.cs`, línea 253). Sin esa línea
el healthcheck de Docker recibiría `401` y el contenedor se marcaría como no saludable.

## 4. Verificación de la matriz

Tres capas, cada una con su comando:

| Capa | Qué comprueba | Comando / evidencia |
|---|---|---|
| **Reflexión** (`Zentric.Tests/Presentation/EndpointAuthorizationMatrixTests.cs`, 7 casos) | Que **ninguna acción quede sin política** (toda acción declara `[Authorize(Policy = …)]` o `[AllowAnonymous]` explícito); que la política declarada por cada acción **coincida con la tabla §3**; que ninguna política quede **muerta** (registrada y no usada); y tres reglas puntuales de la Ley: `InventoryManagement` no incluye Supervisor, `ReturnApprove` es solo Vendedor, y todo rol del enum aparece en la matriz | `dotnet test Zentric.slnx --filter EndpointAuthorizationMatrixTests` → **7/7 PASS** |
| **Prueba de mutación** | Que la suite anterior **pueda fallar**: se añadió `Administrator` a `ReturnApprove` a propósito → `Failed: 1, Passed: 6`; luego se revirtió | ejecutado 2026-09-29 sobre `AuthorizationPolicies.cs` |
| **Fuego real** (Docker + PostgreSQL) | 36 comprobaciones con tokens de los cinco roles contra la API desplegada: `401` anónimo, `403` por rol, "pasa la barrera" (`400`/`404`) cuando el rol sí puede, y 3 comprobaciones del contrato de `enum` (Q-22 / `ADR-0012`: el entero da `400`, el nombre da `200`, el nombre en minúsculas da `200`) | `pwsh -File backend/scripts/authorization-smoke.ps1` → `TOTAL DE COMPROBACIONES: 36 \| FALLOS: 0`, exit `0` (2026-09-29, verificado en proceso limpio). El script crea sus propios usuarios desechables (`*@q21.test`), imprime el `DELETE` de limpieza y sale **siempre** con `exit $fallos` (sin eso, una corrida limpia heredaba el código de salida del comando anterior y CI se comía un verde falso) |

Las comprobaciones del fuego real que mas valen:

| Comprobación | Resultado |
|---|---|
| `GET /api/Catalog/products` sin token | `401` (política de reserva) |
| `GET /api/users` con token de Comprador o de Supervisor | `403` — antes de Q-21 devolvía `200` con la lista completa |
| `POST /api/returns/{id}/approve` con token de Administrador | `403`: el Admin **no** aprueba devoluciones (ADDENDUM Dominio 10) |
| `POST /api/returns/{id}/approve` con token de Vendedor | `400`: pasó la barrera, el `400` lo produce el payload vacío |
| `POST /api/returns/{id}/inspect` con token de Vendedor | `403`; con token de Operador Logístico, `400` |
| `POST /api/orders/cart` con token de Supervisor o Vendedor | `403`; con token de Comprador, `400` |
| `POST /api/users` anónimo con `role = Buyer` | `200` (única excepción a RG-01, Dominio 3) |
| `POST /api/users` anónimo con `role = Seller` | `403` |

**Propiedad del recurso (Q-21b, `ADR-0013`): 33 comprobaciones adicionales**, ejecutadas en la
misma corrida. El smoke construye un pedido real de punta a punta (producto → bodega → stock →
carrito → ítem → checkout → pago → facturas → devolución → aprobación) con **dos** compradores y
**dos** vendedores, y comprueba que:

| Comprobación | Resultado |
|---|---|
| `POST /api/Catalog/products` con un `vendorId` **falso** en el cuerpo | El producto queda atribuido al vendedor del token; el `vendorId` del cuerpo se descarta |
| Stock en bodega ajena / producto de otro | `400` con el mensaje de "no existe" |
| Listado de bodegas del Vendedor | Solo las suyas; pedir las de otro → `400`; leer por id → `404` |
| Otro comprador mete ítems, hace checkout o paga el pedido ajeno | `400` con "Order not found."; añadir/leer el pedido → `404` |
| `GET /api/orders/{id}` con Admin, Operador y Supervisor | `200` (esto **repara** el 404 que la matriz de Q-21 no contemplaba) |
| `GET /api/orders/{id}` con Vendedor | Vista filtrada: `items=1`, `subtotal=20000`, sin total del pedido |
| Facturas del pedido por rol | Comprador 1 (Maestra), Vendedor 1 (la suya), Administrador 3 (con plataforma); para otro comprador → `404` |
| Devolución sobre pedido ajeno | `400` "Order not found." |
| Aprobación de la devolución | El vendedor del producto → `200`; otro vendedor → `400` "Return request not found." |

> El smoke mira el **cuerpo** de la respuesta en estas comprobaciones, no solo el código: un
> `400` por otra causa (validación, payload) haría pasar la prueba por el motivo equivocado, que
> es justo lo que pasó con un nombre de prueba inválido en la primera ejecución.

> Leer `400`/`404` como "autorizado" es correcto **en este smoke**: las peticiones viajan con
> cuerpo vacío o con un GUID inexistente a propósito. Lo que se afirma es que la petición
> **no** fue detenida por autorización.

## 5. Propiedad del recurso (`[CONFIRMADO]` Q-21b, 2026-09-29, `ADR-0013`)

La matriz de §2 responde **qué puede hacer** cada rol. Esta sección responde **sobre qué
recurso**: la propiedad se comprueba además del rol, con la identidad del token (`sub`).

| Regla | Enunciado |
|---|---|
| 7 | **Solo Comprador y Vendedor llevan filtro de dueño.** Operador, Administrador y Supervisor no: para ellos el recurso no tiene dueño o su función es transversal |
| 8 | **La identidad sale del token, nunca del cuerpo.** `POST /api/orders/cart` no acepta `buyerId` y `POST /api/Catalog/products` descarta el `vendorId` que venga en el cuerpo |
| 9 | **Un recurso ajeno responde `404`** con el mismo mensaje que uno inexistente. `403` sigue significando "tu rol no entra" |
| 10 | **El `VendorId` de un vendedor es su `User.Id`** (convención ratificada, sin entidad `Vendor`) |
| 11 | **El dueño del stock es el dueño del producto**, no el de la bodega: el Vendedor ve sus bienes estén donde estén |

### 5.1 Endpoint por endpoint

| Endpoint | Comprador | Vendedor | Operador | Admin / Supervisor |
|---|---|---|---|---|
| `GET /api/orders/{id}` | Su pedido (`OrderDto`) | Pedidos donde tiene líneas, **vista filtrada** (`SellerOrderViewDto`: estado, sus líneas, su subtotal; sin `buyerId`, sin total completo) | Sin filtro | Sin filtro |
| `GET /api/billing/invoices/order/{orderId}` | Solo la Factura Maestra de un pedido propio | Solo sus facturas de vendedor | — (política no le alcanza) | Todas |
| `GET /api/returns/{id}` | Devoluciones de pedidos propios | Devoluciones de productos suyos | Sin filtro | Sin filtro |
| `GET /api/logistics/fulfillment/{id}` | Despachos de pedidos propios | Despachos de su `VendorId` | Sin filtro | Sin filtro |
| `GET /api/warehouses` | — (política) | Solo las suyas; pedir las de otro → `400` | Sin filtro | Sin filtro |
| `GET /api/warehouses/{id}` | — | Las suyas; ajena → `404` | Sin filtro | Sin filtro |
| `GET /api/Inventories/{variantId}` | — (política) | Stock de sus productos; variante ajena → `404` | Sin filtro | — (política) |
| `POST /api/orders/cart` | Su carrito (identidad del token) | `403` | `403` | `403` |
| `POST /api/orders/cart/items`, `/checkout`, `/pay` | Su pedido; el ajeno responde `not found` | `403` | `403` | `403` |
| `POST /api/returns/request` | Su pedido | `403` | `403` | `403` |
| `POST /api/returns/{id}/approve` | `403` | Aprobar solo devoluciones de sus productos | `403` | `403` |
| `POST /api/returns/{id}/inspect` | `403` | `403` | Sin filtro | `403` |
| `POST /api/Inventories/stock` | `403` | Su producto **y** su bodega | Sin filtro | `403` |
| `POST /api/Catalog/products` | `403` | Se registra a su nombre (el `vendorId` del cuerpo se descarta) | `403` | `403` |
| `POST /api/Logistics/fulfillment` | `403` | Solo a su nombre | Sin filtro | `403` |
| `POST /api/Logistics/fulfillment/{id}/dispatch`, `/cancel-ghost-stock` | `403` | Solo sus despachos | Despachar sin filtro; **cancelar `403`** (Q-21c abierta) | `403` |

`—` = el rol no entra por la matriz de §2, así que responde `403` antes de llegar a la propiedad.

### 5.2 Dónde vive la comprobación

- `ICurrentUserAccessor` (`Zentric.Api/Security/ClaimsUserAccessor.cs`) resuelve el `sub`; los
  controladores componen el comando o la consulta con esa identidad.
- El filtro va en el handler o en el repositorio, **nunca en el controlador**, y dentro de la
  consulta (`GetByIdForBuyerAsync`, `GetByIdForVendorAsync`).
- Razón completa, alternativas descartadas y consecuencias: [ADR-0013](../Adr/0013-propiedad-del-recurso-por-rol.md).



## 6. Conflictos detectados con el contrato de frontend

`frontendSDD/Frontend-Role-Modules.md` (documento entregado por el cliente) **no coincide** con
esta matriz en cuatro puntos. Se reportan aquí; el documento del cliente no se edita:

| Punto | El documento de frontend dice | La matriz aplica | Base |
|---|---|---|---|
| Aprobación de devoluciones | módulo de **Administrador** → `POST /api/Returns/{id}/approve` (línea 54; fila "Devoluciones | ✔ (reembolso)" bajo Admin) | solo **Vendedor** | ADDENDUM Dominio 10 + [ADR-0006](../Adr/0006-resolucion-contradiccion-ley-addendum.md): el ADDENDUM tiene la última palabra |
| Emisión de facturas | módulo de **Vendedor** → `POST /api/Billing/invoices/generate` (línea 68) | solo **Administrador** | Matriz §12; el ADDENDUM Dominio 9 no asigna la emisión → **Q-21d** |
| Solicitud de devolución | "Comprador, Admin" (línea 96) | solo **Comprador** | §12 "Gestión Reembolsos" solo en Comprador |
| Cantidad de roles | "Los roles son **cuatro**: Administrador, Vendedor, Comprador y Operador" (línea 6) | `UserRole` tiene **cinco**: falta `Supervisor`, que en el backend tiene lectura y **ningún módulo** en el frontend | ZENTRIC.md §5 y §12 sí listan Supervisor → **Q-21e** |

**Consecuencia práctica para el frontend:** los botones de los puntos 1 y 3 responden `403` con
los roles que ahí se muestran. O se corrige el documento de frontend, o el Owner dicta que la Ley
está desactualizada; el backend no afloja la matriz por conveniencia de pantalla.

