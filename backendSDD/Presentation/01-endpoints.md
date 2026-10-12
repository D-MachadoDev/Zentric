# Capa de Presentación - Endpoints API y Especificación OpenAPI / Swagger

Este documento define la especificación oficial (SSoT) de la capa de presentación de `Zentric.Api`, documentada interactivamente a través de **Swagger UI** (`/swagger`) y exportable como especificación **OpenAPI v1** (`/swagger/v1/swagger.json`).

---

## 1. Configuración de Seguridad y Esquema Bearer (OpenAPI)

La API **autentica de verdad** (RG-01, [ADR-0009](../Adr/0009-autenticacion-jwt-rg01.md)) y exige token por **política de reserva** en todo endpoint.

- **Esquema de Seguridad:** `Bearer` (tipo HTTP, formato JWT, HS256).
- **Cabecera HTTP:** `Authorization: Bearer <token>` — obtenido en `POST /api/auth/login`.
- **Swagger UI:** botón **Authorize** con `AddSecurityDefinition` / `AddSecurityRequirement`, ya
  operativo: sin token, Swagger recibe `401` como cualquier otro cliente.
- **Vida del token:** 60 minutos. **No hay token de refresco.**
- **Endpoints anónimos** (los únicos sin token):
  | Ruta | Por qué |
  | --- | --- |
  | `POST /api/auth/login` | No se puede autenticar si no se puede pedir el token |
  | `POST /api/users` **sólo con `role = Buyer`** | ZENTRIC.md incluye "Registro de compradores"; sin él no existe la primera cuenta |
  | `GET /health` | Lo invoca el healthcheck de Docker; su `.AllowAnonymous()` es explícito porque la `FallbackPolicy` también alcanza a los endpoints mínimos |
- **Roles (RG-03):** implementado **2026-09-29** con [ADR-0011](../Adr/0011-matriz-autorizacion-por-rol.md).
  Cada acción declara una de las 20 políticas de `AuthorizationPolicies`, que es la Matriz de
  Responsabilidades de ZENTRIC.md §12 escrita una sola vez; la lista completa por endpoint está en
  [02-authorization.md](02-authorization.md). La `FallbackPolicy` exige token en todo lo demás, así
  que una ruta sin decorar **nace cerrada**, y un rol que no entra responde `403`.

> **Nota histórica:** este documento afirmaba que "las rutas estaban abiertas a nivel de
> autorización técnica en desarrollo". Eso ya **no es cierto** y fue sustituido por la política
> de reserva descrita arriba.

---

## 2. Patrón Global de Respuestas y Manejo de Errores

Todos los controladores heredan o implementan contratos HTTP RESTful con formato `application/json` y `application/problem+json`:

- **Éxito (200 OK):** Retorna el identificador `Guid` generado, el DTO de consulta correspondiente o `200 OK` vacío en comandos de mutación.
- **Fallo de Validación o Negocio (400 Bad Request):** Respuestas mapeadas a `ProblemDetails` y servidas
  como **`application/problem+json`**, con la forma de **RFC 7807** (la que produce ASP.NET Core):

  > **Atención al número de RFC.** El cuerpo es el de **RFC 7807**, y el ejemplo de abajo lo
  > demuestra con su propio campo `type`. **RFC 9457** es el estándar vigente que sustituye a 7807 y
  > la migración está **pendiente y sin implementar** (brecha `R-05` del
  > [`frontendSDD/Frontend-Adapters.md`](../../frontendSDD/Frontend-Adapters.md)). No se anuncie
  > 9457 en el contrato: un cliente que lo asuma esperará campos que el servidor todavía no envía.

  ```json
  {
    "type": "https://tools.ietf.org/html/rfc7807",
    "title": "Bad Request",
    "status": 400,
    "detail": "Descripción de la invariante violada o error de validación."
  }
  ```
- **Recurso no Encontrado (404 Not Found):** Respuestas `ProblemDetails` (misma forma RFC 7807, misma nota) cuando un identificador no existe **o no pertenece al llamante**.
- **Falla Técnica no Controlada (500 Internal Server Error):** Interceptada por el middleware global `app.UseExceptionHandler()` para no filtrar detalles de infraestructura (cadenas de conexión, trazas de SQL) al cliente.

---

## 3. Paginación de Listados

Los listados usan `PageRequest` y devuelven `PagedResult<T>`.

| Parámetro | Regla |
|---|---|
| `page` | Base cero: la primera página es `0`. Un valor negativo se recorta a `0`. |
| `size` | Por defecto `20`, máximo `100`. Un valor `<= 0` cae al defecto; uno mayor que `100` se recorta. |

Respuesta (`200 OK`):

```json
{
  "items": [ ... ],
  "page": 0,
  "size": 20,
  "totalItems": 137,
  "totalPages": 7,
  "hasPrevious": false,
  "hasNext": true
}
```

El `totalItems` se cuenta en la base **antes** de aplicar `Skip`/`Take`, para que el
frontend pueda construir sus controles de paginación sin adivinar.

Endpoint de referencia: `GET /api/Catalog/products/paged?vendorId={id}&page=0&size=20`.

> El listado sin paginar (`GET /api/Catalog/products`) se conserva por compatibilidad
> con clientes existentes, pero **el frontend debe usar el paginado**.

### 3.1 Identidad del llamante y aislamiento por comprador

**Actualizado 2026-09-28 (`ADR-0009`, cierra RG-01).** La identidad viaja en un
**token JWT** (`Authorization: Bearer {token}`) emitido por `POST /api/auth/login`.

- La cabecera **`X-Buyer-Id` fue eliminada** y ya no autentica.
- `ClaimsBuyerAccessor` lee **solo** el claim `sub` de un token ya validado por el
  middleware; no existe ninguna vía alternativa de identidad.
- **Política de reserva:** todo endpoint exige token, salvo `POST /api/auth/login`,
  `POST /api/users` con `role = Buyer`, y `GET /health` (lo invoca el healthcheck de Docker).

`GET /api/Orders/{id}` está aislado: usa `GetOrderByIdForBuyerQuery`, que filtra por
`BuyerId` **en la consulta**, no después de leer el pedido. `BuyerId` sale del claim `sub`
porque `Buyer.UserId` es 1:1 con `User.Id`.

| Situación | Respuesta |
|---|---|
| El comprador dueño, con token JWT válido | `200 OK` con el pedido |
| Un comprador distinto al dueño | `404 Not Found` (mismo mensaje que si no existiera) |
| Sin token | `401 Unauthorized` |

> **La identidad viaja en `Authorization: Bearer`, no en `X-Buyer-Id`.** La cabecera `X-Buyer-Id`
> se usaba antes de [`ADR-0009`](../../backendSDD/Adr/0009-autenticacion-jwt-rg01.md) y **fue
> eliminada**: el cliente la escribía libremente, así que cualquiera que la enviara se hacía pasar
> por otro. Hoy el comprador sale del claim `sub` de un token ya validado, y enviar `X-Buyer-Id`
> no autentica a nadie.

> El mismo mensaje para "no existe" y "no es tuyo" es deliberado: distinguirlos
> permitiría enumerar pedidos ajenos probando GUIDs.

### 3.2 Autenticación JWT — implementada (`ADR-0009`)

| Endpoint | Método | Auth | Contrato |
|---|---|:---:|---|
| `/api/auth/login` | `POST` | anónimo | Body `{ email, password }` → `200 { token, expiresAt, userId, email, fullName, role }` · `400` correo inválido · `401` credenciales inválidas (mensaje único: no revela qué cuentas existen) |
| `/api/auth/me` | `GET` | token | `200 { userId, email, fullName, role }` leído de los claims del token ya validado (no consulta la base) · `401` token ausente, forjado o caducado |
| `/api/users` | `POST` | anónimo **solo** con `role = Buyer` | `403` para cualquier otro rol sin token de Administrador (ZENTRIC.md Dominio 3) |

- **Claims emitidas:** `sub` (id del usuario y, 1:1, del comprador), `email`, `name`
  (nombre completo) y el rol. El nombre se emite como `name`: el validador de .NET 10
  **no** reescribe los tipos de claim entrantes, así que el controlador debe leer el
  nombre literal que se escribió en el token. Emitirlo como `unique_name` producía una
  API que autenticaba correctamente pero devolvía `fullName` vacío en `/auth/me`
  (defecto corregido el 2026-09-29, verificado en Docker).
- **Caducidad:** 60 minutos (`Jwt:ExpirationMinutes`), calculada con `IClock`
  ([ADR-0010](../Adr/0010-relojo-como-puerto-iclock.md)), no con `DateTime.UtcNow`.
- **Clave:** `Jwt__SigningKey` por variable de entorno; la API **no arranca** si falta o
  si mide menos de 32 bytes. `appsettings.json` la deja vacía a propósito; solo
  `appsettings.Development.json` lleva una clave de desarrollo explícitamente rotulada.
- **Primer Administrador:** lo crea el arranque desde `Bootstrap__AdministratorEmail` /
  `Bootstrap__AdministratorPassword` **solo si la base no tiene ninguno**. Es la única vía
  por la que un rol privilegiado entra al sistema, porque el auto-registro está limitado a
  Compradores. Retirar las variables en cuanto exista.

### 3.3 Los `enum` del contrato viajan como nombre en el cuerpo JSON (**Q-22 cerrada, ADR-0012**)

Desde el 2026-09-29 el cuerpo JSON **solo acepta el nombre** del enum (`"Buyer"`, `"Physical"`,
`"Vendor"`). Un entero en un campo de enum responde `400`. Registrado en
`Zentric.Api/Contracts/EnumJsonContract.cs` — `JsonStringEnumConverter` con
`allowIntegerValues: false` — y verificado contra la API desplegada en Docker:

| Petición | Respuesta |
|---|---|
| `POST /api/users` con `"role": "Buyer"` (anónimo) | `200` con el `Guid` del usuario |
| `POST /api/users` con `"role":"supervisor"` en minúsculas y token de Administrador | `200` — la lectura no distingue mayúsculas |
| `POST /api/users` con `"role": 2` y token de Administrador | `400` con `$.role: The JSON value could not be converted…` |
| `GET /api/users?role=Seller` y `?role=1` | `200` — el binding de query sigue aceptando ambas formas |

Las respuestas **ya** devolvían el nombre (`order.Status.ToString()`), así que la decisión no cambió
la salida: alineó la entrada con lo que la salida y la query ya decían. Los enum que entran por
cuerpo son `UserRole` (registro de usuario), `ProductType` (producto y devolución) y
`WarehouseType` (bodega).

`UserRole`: `Buyer`, `Seller`, `Administrator`, `Supervisor`, `LogisticsOperator`. Los índices
`0..4` existen en el enum C# pero **no** forman parte del contrato REST.

Cobertura: 5 pruebas en `Zentric.Tests/Presentation/EnumJsonContractTests.cs` (sobre la tubería
real de MVC, con prueba de mutación) y 3 comprobaciones HTTP en
`backend/scripts/authorization-smoke.ps1`. Decisión y alternativas descartadas:
[ADR-0012](../Adr/0012-contrato-json-de-los-enum-por-nombre.md).

### 3.4 CORS

Una política `Frontend` habilita el origen declarado en `Cors:AllowedOrigins`
(`appsettings.json`, o `Cors__AllowedOrigins` por variable de entorno). Varios orígenes se
separan por comas.

| Petición | Resultado |
|---|---|
| `Origin: http://localhost:5173` | `200` + `Access-Control-Allow-Origin` con ese origen |
| Origen no declarado | `200` pero **sin** header CORS; el navegador bloquea la respuesta |
| Preflight `OPTIONS` | `204` + `Access-Control-Allow-Methods` |

> **No se usa el comodín `*`.** El lote 6 prevé JWT, y el protocolo prohíbe combinar
> comodín con credenciales. Los orígenes deben declararse de forma explícita.

---

## 4. Catálogo Detallado de Endpoints por Bounded Context (Tags de Swagger)

> **Autorización:** cada uno de los 44 endpoints de este catálogo declara una política de
> `AuthorizationPolicies`. La tabla endpoint → política → roles está en
> [02-authorization.md §3](02-authorization.md#3-matriz-por-endpoint-44-acciones) y es la que se
> verifica por reflexión en `EndpointAuthorizationMatrixTests`; este catálogo se ocupa del contrato,
> no del permiso.

### 3.0. Tag: `0. Autenticacion` (`/api/auth`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/auth/login` | Command | `LoginCommand` (Body: `email`, `password`) — **anónimo** | `200 OK (AuthTokenResponse)`<br>`400 Bad Request (ProblemDetails)`<br>`401 Unauthorized (ProblemDetails)` | Autentica con correo y contraseña (RG-01, [ADR-0009](../Adr/0009-autenticacion-jwt-rg01.md)). El hash se compara en el servidor contra `PBKDF2-HMAC-SHA256`. Un correo inexistente, una contraseña incorrecta y un usuario bloqueado o eliminado responden **el mismo `401`**: distinguirlos permitiría enumerar cuentas registradas. Devuelve token JWT (60 min, `IClock`), su caducidad y la identidad. |
| `GET` | `/api/auth/me` | Query | token en cabecera | `200 OK (CurrentUserResponse)`<br>`401 Unauthorized (ProblemDetails)` | Devuelve la identidad que **declara el token ya validado** (`userId`, `email`, `fullName`, `role`); no consulta la base. Permite al cliente revalidar la sesión al arrancar sin guardar la identidad en otro sitio. |

### 3.1. Tag: `1. Usuarios y Roles` (`/api/users`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/users` | Command | `CreateUserCommand` (Body) — **anónimo solo si `role = "Buyer"`** | `200 OK (Guid)`<br>`400 Bad Request (ProblemDetails)`<br>`403 Forbidden (ProblemDetails)` | Registra un nuevo usuario en el sistema. Valida unicidad de `Email` e `IdentityDocument` de forma asíncrona. Asigna roles válidos: `Buyer`, `Seller`, `Administrator`, `LogisticsOperator`, `Supervisor` (en el cuerpo JSON el rol viaja como **nombre**, ver [3.3](#33-los-enum-del-contrato-viajan-como-nombre-en-el-cuerpo-json-q-22-cerrada-adr-0012)). La contraseña viaja en claro y **el servidor calcula el hash**: el cliente nunca envía `PasswordHash`. Cualquier rol distinto de `Buyer` sin token de Administrador responde `403` (ZENTRIC.md Dominio 3: los vendedores no se auto-registran). |
| `GET` | `/api/users` | Query | `role` (Query param opcional) | `200 OK (List<UserDto>)` | Lista todos los usuarios registrados, permitiendo filtrar por rol (ej. `?role=Seller` o `?role=Buyer`). |
| `GET` | `/api/users/{id}` | Query | `id` (Path) | `200 OK (UserDto)`<br>`404 Not Found (ProblemDetails)` | Obtiene el detalle técnico y estado de un usuario por su ID. |
| `POST` | `/api/users/{id}/block` | Command | `id` (Path) | `200 OK`<br>`400 Bad Request (ProblemDetails)`<br>`401 Unauthorized (ProblemDetails)`<br>`403 Forbidden (ProblemDetails)`<br>`404 Not Found (ProblemDetails)` | **Bloquea al usuario** y le cierra el acceso (INV-05). El bloqueo no cascadea: sus productos siguen `Published` y el checkout rechaza cualquier carrito que contenga uno de ellos (la barrera es la autorización, no el catálogo). Además impide el login porque `User.CanAuthenticate` exige `Active` y no borrado. Los pedidos ya pagados y sus despachos no se tocan (RG-11). Solo Administrador (política `UserAdministration`). |
| `POST` | `/api/users/{id}/activate` | Command | `id` (Path) | `200 OK`<br>`400 Bad Request (ProblemDetails)`<br>`401 Unauthorized (ProblemDetails)`<br>`403 Forbidden (ProblemDetails)`<br>`404 Not Found (ProblemDetails)` | **Devuelve el acceso** a un usuario bloqueado (dictamen Q-26, INV-05). Sin reactivación un error del Administrador sería irreversible. Los productos del Vendedor ya eran visibles de nuevo desde el bloqueo, porque nunca cambiaron de estado. Solo Administrador (política `UserAdministration`). |

---

### 3.2. Tag: `2. Bodegas` (`/api/warehouses`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/warehouses` | Command | `CreateWarehouseCommand` (Body) | `200 OK (Guid)`<br>`400 Bad Request (ProblemDetails)` | Registra una bodega física de almacenamiento especificando nombre, ubicación y capacidad volumétrica ($m^3$). |
| `GET` | `/api/warehouses` | Query | `vendorId` (Query param opcional) | `200 OK (List<WarehouseDto>)` | Lista todas las bodegas activas o filtra por las pertenecientes a un vendedor (`?vendorId=...`). |
| `GET` | `/api/warehouses/{id}` | Query | `id` (Path) | `200 OK (WarehouseDto)`<br>`404 Not Found (ProblemDetails)` | Obtiene la ficha técnica y capacidad volumétrica de una bodega por su ID. |

---

### 3.3. Tag: `3. Inventario y Stock` (`/api/inventories`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/inventories/stock` | Command | `AddStockCommand` (Body) | `200 OK (Guid)`<br>`400 Bad Request (ProblemDetails)` | Ingresa existencias de un producto en una bodega, diferenciando entre unidades nuevas y usadas/reacondicionadas. |
| `POST` | `/api/inventories/{id}/adjust` | Command | `AdjustInventoryRequest` (Body: `countedQuantity`, `reason`) + `id` (Path) | `200 OK (AdjustInventoryResult)`<br>`400 Bad Request (ProblemDetails)`<br>`401 Unauthorized (ProblemDetails)`<br>`403 Forbidden (ProblemDetails)`<br>`404 Not Found (ProblemDetails)` | **Ajusta inventario por conteo fisico** (ADR-0021). El conteo SOLO puede reducir el disponible (no inventar stock). Registra evidencia: cantidad contada, motivo, quien conto, cuando. **Idempotente**: reenviar la misma peticion en 5 min devuelve el mismo resultado sin duplicar. Solo Administrador y Supervisor (politica `InventoryAdjust`). |
| `GET` | `/api/inventories/{variantId}` | Query | `variantId` (Path) | `200 OK (List<InventoryDto>)` | Consulta existencias distribuidas por bodega (disponible, reservado, usado, dañado) para un SKU/variante. |

---

### 3.4. Tag: `4. Catálogo de Productos` (`/api/catalog`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/catalog/products` | Command | `CreateProductCommand` (Body) | `200 OK (CreatedProductDto)`<br>`400 Bad Request (ProblemDetails)` | Da de alta la ficha técnica de un producto que **nace `Published`** (auto-publicación, CAT-01) con dimensiones físicas y precio base. Devuelve `productId` y `variantIds` — el Vendedor necesita el `variantId` para dar de alta stock. Es una **lista** y no un `Guid` porque un producto `Digital` puede nacer sin variantes (Q-10 = C3, ADR-0003) y la forma del contrato no debe depender de lo que se pidió. |
| `POST` | `/api/catalog/products/{productId}/publish` | Command | `id` (Path) | `200 OK`<br>`400 Bad Request (ProblemDetails)` | **Reactiva** un producto `Suspended` devolviéndolo a `Published` (vuelve a ser visible y adquirible). Un producto recién creado ya nace `Published` (CAT-01); publicar uno ya publicado responde `400`. |
| `POST` | `/api/catalog/products/{productId}/suspend` | Command | `id` (Path) | `200 OK`<br>`400 Bad Request (ProblemDetails)`<br>`401 Unauthorized (ProblemDetails)`<br>`403 Forbidden (ProblemDetails)`<br>`404 Not Found (ProblemDetails)` | **Suspende** un producto llevandolo al estado `Suspended` (Q-25: camino de entrada). El producto deja de ser visible en busquedas y no se puede agregar a carritos — **ambas promesas cerradas en Q-27**: el listado filtra por estado con la excepción de la vista de gestión del propio Vendedor, y el carrito comprueba `Product.CanBeSold`. Los pedidos ya pagados y sus despachos no se tocan. Solo el Vendedor del producto (política `ProductManagement`). |
| `GET` | `/api/catalog/products` | Query | `vendorId` (Query param opcional) | `200 OK (List<ProductDto>)` | Consulta el catálogo de productos con sus variantes y precios, con filtro opcional por vendedor. **Visibilidad (Q-27): sólo devuelve productos `Published`.** La única excepción es el Vendedor que pide su **propio** `vendorId` —esa es su vista de gestión y sí refleja los `Suspended`, porque `publish` (§3.4) exige encontrar antes el producto y no existe listado de "mis productos". La identidad sale del token, nunca de la petición. |
| `GET` | `/api/catalog/products/paged` | Query | `vendorId` (Query opcional), `page` (defecto `0`), `size` (defecto `PageRequest.DefaultPageSize`) | `200 OK (PagedResult<ProductDto>)`<br>`400 Bad Request (ProblemDetails)` | La misma consulta con **paginación**: devuelve la página más los metadatos (`page`, `size`, total). Es el endpoint que consume cualquier listado que no quiera traerse el catálogo entero. Comparte con el listado simple la **misma regla de visibilidad (Q-27)**, y el filtro se aplica en la misma consulta que el conteo: si el estado se aplicara después de contar, `total` saldría inflado y el número de páginas no cuadraría con la página devuelta. |
| `GET` | `/api/catalog/products/{id}` | Query | `id` (Path) | `200 OK (ProductDto)`<br>`404 Not Found (ProblemDetails)` | Ficha técnica completa de un producto con sus variantes e identificadores de inventario. |

---

### 3.5. Tag: `5. Carrito y Órdenes` (`/api/orders`)
> **Propiedad del recurso (Q-21b, `ADR-0013`):** las filas marcadas con ⚠️ cambian de contrato o
> de comportamiento con el dictamen del 2026-09-29. El detalle por rol está en
> [02-authorization.md §5](02-authorization.md#5-propiedad-del-recurso-confirmado-q-21b-2026-09-29-adr-0013).

| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/orders/cart` | Command | **Sin cuerpo** ⚠️ | `200 OK (Guid)`<br>`401 Unauthorized` | Inicializa una orden en estado `Cart` del **comprador del token**. Ya no acepta `buyerId`: un carrito a nombre de otro es imposible por contrato |
| `POST` | `/api/orders/cart/items` | Command | `AddOrderItemCommand` (Body) — el `BuyerId` del cuerpo se descarta ⚠️ | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized` | Añade un producto al carrito verificando existencias. El producto debe ser vendible (`Product.CanBeSold`): si está `Suspended`, `Discontinued` o borrado, `400` con "Product is not available for sale." (Q-27, promesa de §3.4). El carrito debe ser del llamante: si no, `400` con "Order not found." |
| `POST` | `/api/orders/{orderId}/checkout` | Command | `orderId` (Path) | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized` | Cierra el carrito, reserva el stock, activa la ventana de 15 minutos y genera despachos agrupados por `VendorId`. Solo sobre un pedido propio ⚠️ |
| `POST` | `/api/orders/{orderId}/pay` | Command | `orderId` (Path) | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized` | Cobra y consolida la reserva, pasando el pedido a `Paid`. Solo sobre un pedido propio ⚠️ |
| `GET` | `/api/orders/{id}` | Query | `id` (Path) | `200 OK (OrderDto \| SellerOrderViewDto)` ⚠️<br>`401 Unauthorized`<br>`404 Not Found` | La **forma depende del rol**: el Vendedor recibe la vista filtrada (sus líneas y su subtotal, sin `buyerId` ni total completo); los demás, el pedido completo. Un pedido ajeno responde `404` como uno inexistente |

---

### 3.6. Tag: `6. Logística y Despacho` (`/api/logistics`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/logistics/fulfillment` | Command | `CreateFulfillmentOrderCommand` (Body) | `200 OK (Guid)`<br>`400 Bad Request (ProblemDetails)` | Crea una orden de preparación y empaque para los ítems pertenecientes a un vendedor y bodega específica. |
| `POST` | `/api/logistics/fulfillment/{id}/pack` | Command | `id` (Path); el handler recibe `userId` y `role` del token | `200 OK`<br>`400 Bad Request (ProblemDetails)`<br>`404 Not Found (ProblemDetails)` | Empaca: `PendingPack` → `Packed` (ADDENDUM Dominio 8 estado 2). Devuelve `400` si ya está empacada, despachada o cancelada y `404` si no existe o es de otro vendedor. **Q-21b:** el Vendedor solo empaca los suyos; el Operador empaca cualquiera. |
| `POST` | `/api/logistics/fulfillment/{id}/dispatch` | Command | `id` (Path) | `200 OK`<br>`400 Bad Request (ProblemDetails)` | Marca el paquete como `Dispatched` y descuenta formalmente el stock reservado de la bodega. |
| `POST` | `/api/logistics/fulfillment/{id}/deliver` | Command | `id` (Path); el handler recibe `userId` y `role` del token | `200 OK`<br>`400 Bad Request (ProblemDetails)`<br>`403 Forbidden (ProblemDetails)` | Confirma la entrega: `Dispatched` → `Delivered` (ADDENDUM Dominio 8 estado 4, "Entregado: Recibido por el comprador"). **Solo el Operador Logístico** — dictamen **Q-23** (Owner, 2026-10-01); el Vendedor empaca y despacha pero no puede certificar la entrega de su propio paquete. Devuelve `400` si no está `Dispatched` o ya fue entregada. |
| `POST` | `/api/logistics/fulfillment/cancel-ghost-stock` | Command | `CancelFulfillmentOrderDueToNoStockCommand` (Body) | `200 OK (Guid)`<br>`400 Bad Request (ProblemDetails)` | Reporta faltante físico en bodega (stock fantasma), cancela la orden de fulfillment, libera la reserva de existencias y **origina la devolución obligatoria** con crédito al comprador. Ejecutable por el Vendedor y por el Operador Logístico ([Q-21c](../Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md)), porque es quien está en la bodega. |
| `GET` | `/api/logistics/fulfillment/{id}` | Query | `id` (Path) | `200 OK (FulfillmentOrderDto)`<br>`404 Not Found (ProblemDetails)` | Consulta el estado del despacho logístico, paquetes y números de guía (`TrackingNumber`). |

---

### 3.7. Tag: `7. Devoluciones y Garantías` (`/api/returns`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/returns/request` | Command | `RequestReturnCommand` (Body: `CustomerOrderId`, `VariantId`, `WarehouseId` de recepción, `Quantity`) | `200 OK (Guid)`<br>`400 Bad Request (ProblemDetails)`<br>`404 Not Found (ProblemDetails)` | Radica una solicitud de devolución para un producto entregado dentro del período de garantía legal. El **tipo de producto no viaja**: lo deduce el servidor (un digital no se devuelve, aunque el cliente lo declare físico) y el `WarehouseId` se valida contra bodegas reales del Marketplace o del propio vendedor (ADR-0018). |
| `POST` | `/api/returns/{id}/inspect` | Command | `id` (Path), `InspectReturnRequestDto` (Body) | `200 OK`<br>`400 Bad Request (ProblemDetails)` | Registra la inspección física en bodega dictaminando si la mercancía está en buen estado o dañada. |
| `POST` | `/api/returns/{id}/approve` | Command | `id` (Path), `ApproveReturnCommand` (Body: solo `ReturnRequestId`) | `200 OK`<br>`400 Bad Request (ProblemDetails)`<br>`404 Not Found (ProblemDetails)` | Aprueba comercialmente la devolución y dispara el evento de dominio `ReturnApprovedEvent` que reingresa el producto como stock usado (`UsedQuantity`). La exención de inspección por lugar de recepción la deduce el servidor (ADR-0018): el cliente ya no envía `isSameWarehouseAndVendor`. |
| `POST` | `/api/returns/{id}/reject` | Command | `id` (Path); el handler recibe `userId` y `role` del token | `200 OK`<br>`400 Bad Request (ProblemDetails)`<br>`404 Not Found (ProblemDetails)` | Otra cara de la misma decisión comercial: rechaza la solicitud si aún está `Solicitada` (`400` en caso contrario). **Comparte la política `ReturnApprove`** (solo Vendedor) — rechazar no abre un poder nuevo al Administrador. `404` si no existe o es de otro vendedor. |
| `POST` | `/api/returns/{id}/refund` | Command | `id` (Path); el handler recibe `userId` y `role` del token | `200 OK`<br>`400 Bad Request (ProblemDetails)`<br>`403 Forbidden (ProblemDetails)` | Emite el reembolso de una devolución ya **aprobada** y acredita el comprobante. **Solo el Administrador** — dictamen **Q-24** (Owner, 2026-10-01). `400` si no está aprobada o si el pedido no tiene comprobante; `403` si el rol no es Administrador. |
| `GET` | `/api/returns/{id}` | Query | `id` (Path) | `200 OK (ReturnRequestDto)`<br>`404 Not Found (ProblemDetails)` | Consulta el estado y dictamen de inspección técnica de una solicitud de devolución. |

---

### 3.8. Tag: `8. Facturación y Liquidación` (`/api/billing`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/billing/invoices/generate/{orderId}` | Command | `orderId` (Path) | `200 OK (bool)`<br>`400 Bad Request (ProblemDetails)` | Emite la Factura Maestra consolidada para el comprador, el detalle de comisión tecnológica para Zentric (`ZentricDetail`) y las facturas split para cada vendedor. **Solo el Administrador** ([Q-21d](../Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md)). Rechaza con `400` si el pedido no está pagado o si ya fue facturado: un segundo clic no puede duplicar la facturación. |
| `POST` | `/api/billing/invoices/annul/{orderId}` | Command | `orderId` (Path), `AnnullMasterInvoiceRequest` (Body: `reason`) | `200 OK`<br>`400 Bad Request (ProblemDetails)`<br>`401 Unauthorized (ProblemDetails)`<br>`403 Forbidden (ProblemDetails)`<br>`404 Not Found (ProblemDetails)` | **Anula la factura maestra** de un pedido (FAC-02). Solo el Administrador (política `BillingGenerate`). Se usa cuando hay un chargeback, el pago es rechazado a posteriori o por timed-out del comprobante. El motivo queda escrito en la propia factura (`AnulledReason`, `AnulledAt`). Las facturas de tipo `VendorDetail` y `ZentricDetail` **no** se anulan: solo la Maestra. |
| `GET` | `/api/billing/invoices/order/{orderId}` | Query | `orderId` (Path) | `200 OK (List<InvoiceDto>)` | Consulta todas las facturas emitidas asociadas a un pedido pagado. |

---


---

## 3.9. Listados de recurso propio (`ADR-0017`)

Cinco recursos —pedidos, despachos, devoluciones, facturas e inventario— solo existían por `GET .../{id}`: sin listado, las pantallas de «mis pedidos», la cola de despacho, la bandeja de devoluciones, «mis facturas» y el panel de inventario no tienen de dónde sacar la lista. Un recurso que no se puede enumerar no está terminado.

| Método | Endpoint | Política | Filtro por rol | Respuestas |
|---|---|---|---|---|
| `GET` | `/api/Orders` | `OrderRead` | `status` (opcional, por nombre) | `200 OK (List<OrderListItemDto>)`<br>`400 Bad Request (ProblemDetails)` |
| `GET` | `/api/logistics/fulfillments` | `FulfillmentRead` | `status` (opcional, por nombre) | `200 OK (List<FulfillmentOrderDto>)`<br>`400 Bad Request (ProblemDetails)` |
| `GET` | `/api/returns` | `ReturnRead` | `status` (opcional, por nombre) | `200 OK (List<ReturnRequestDto>)`<br>`400 Bad Request (ProblemDetails)` |
| `GET` | `/api/billing/invoices` | `BillingRead` | — | `200 OK (List<InvoiceDto>)` |
| `GET` | `/api/Inventories` | `InventoryRead` | — | `200 OK (List<InventoryDto>)` |

### Reglas que rigen los cinco

1. **El filtro lo decide el rol, no un parametro.** No existe forma de pedir los recursos de otro:
   el parametro no existe. Comprador ve lo suyo, Vendedor lo suyo, y Operador, Administrador y
   Supervisor la cola completa. Para facturacion, `BillingRead` **no** incluye al Operador.
2. **El filtro viaja resuelto hasta el repositorio.** La capa Application resuelve el rol y entrega
   identificadores ya resueltos; el repositorio nunca ve el rol. Asi ningun endpoint nuevo puede
   olvidarse del filtro por descuido.
3. **El filtro se aplica EN LA consulta, nunca despues de traerlo todo.** Descartar en memoria daria
   el mismo resultado visible y moveria por la base justo lo que la propiedad oculta.
4. **Un estado desconocido responde `400`, no una lista completa.** Devolver todo mientras el usuario
   cree estar filtrando es el peor fallo posible de un endpoint de listado.
5. **Los DTO son los mismos que los del detalle.** El mismo dato no puede tener dos formas segun la
   pantalla desde la que se pida, porque el frontend acabaria pidiendo una conversion.
6. **Vista del Vendedor en pedidos:** solo sus lineas, solo su subtotal y `buyerId` en `null`.


## 4. Disponibilidad y Consumo

- **Swagger UI Interactivo:** `http://localhost:5000/swagger` (o puerto local configurado).
- **Especificación OpenAPI JSON:** `http://localhost:5000/swagger/v1/swagger.json` listo para importación en Postman o generación de SDKs clientes para el frontend.
