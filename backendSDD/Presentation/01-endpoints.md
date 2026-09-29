# Capa de Presentación - Endpoints API y Especificación OpenAPI / Swagger

Este documento define la especificación oficial (SSoT) de la capa de presentación de `Zentric.Api`, documentada interactivamente a través de **Swagger UI** (`/swagger`) y exportable como especificación **OpenAPI v1** (`/swagger/v1/swagger.json`).

---

## 1. Configuración de Seguridad y Esquema Bearer (OpenAPI)

**Actualizado 2026-09-28 (`ADR-0009`, cierra RG-01).** Ya no está "fuera de alcance": la API
**autentica de verdad** y exige token por **política de reserva** en todo endpoint.

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
  | `GET /health` | Lo invoca el healthcheck de Docker |
- **Roles:** `UserRole` del token (`Buyer`, `Seller`, `Administrator`, `Supervisor`,
  `LogisticsOperator`). El uso de roles para autorizar recurso a recurso (RG-03) **no está
  implementado**: queda como Q-21 en el SDD.

> **Nota histórica:** este documento afirmaba que "las rutas estaban abiertas a nivel de
> autorización técnica en desarrollo". Eso ya **no es cierto** y fue sustituido por la política
> de reserva descrita arriba.

---

## 2. Patrón Global de Respuestas y Manejo de Errores

Todos los controladores heredan o implementan contratos HTTP RESTful con formato `application/json` y `application/problem+json`:

- **Éxito (200 OK):** Retorna el identificador `Guid` generado, el DTO de consulta correspondiente o `200 OK` vacío en comandos de mutación.
- **Fallo de Validación o Negocio (400 Bad Request):** Respuestas mapeadas obligatoriamente al estándar **RFC 9457 (Problem Details)**:
  ```json
  {
    "type": "https://tools.ietf.org/html/rfc7807",
    "title": "Bad Request",
    "status": 400,
    "detail": "Descripción de la invariante violada o error de validación."
  }
  ```
- **Recurso no Encontrado (404 Not Found):** Respuestas RFC 9457 cuando un identificador de consulta no existe en el sistema.
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
| El comprador dueño, con `X-Buyer-Id` válido | `200 OK` con el pedido |
| Un comprador distinto al dueño | `404 Not Found` (mismo mensaje que si no existiera) |
| Sin cabecera y sin identidad autenticada | `401 Unauthorized` |

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

### 3.3 Los `enum` del contrato viajan como número en el cuerpo JSON (**Q-22**)

Verificado contra la API desplegada en Docker el 2026-09-29:

| Petición | Respuesta |
|---|---|
| `POST /api/users` con `"role": "Buyer"` | `400` — `The JSON value could not be converted to CreateUserCommand` |
| `POST /api/users` con `"role": 0` | `200` con el `Guid` del usuario |
| `GET /api/users?role=Seller` | `200` |
| `GET /api/users?role=1` | `200` |

`System.Text.Json` no tiene configurado `JsonStringEnumConverter`, mientras que el binding
de query sí acepta nombres. El resultado es una asimetría: **en el cuerpo se envían
enteros, en la query se aceptan ambas formas**. Afecta a todos los enum del contrato
(`UserRole`, y en las respuestas `OrderStatus`, `PaymentStatus`, `FulfillmentStatus`,
`InvoiceType`).

`UserRole`: `Buyer = 0`, `Seller = 1`, `Administrator = 2`, `Supervisor = 3`,
`LogisticsOperator = 4`.

Unificarlo (registro de `JsonStringEnumConverter`) cambiaría el contrato de entrada y de
salida de todos los enum, así que queda como **Q-22** a decisión del Owner
([SDD, sección 9.1](../SDD.md#91-preguntas-al-owner-abiertas)). Mientras tanto el frontend
envía enteros.

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

### 3.0. Tag: `0. Autenticacion` (`/api/auth`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/auth/login` | Command | `LoginCommand` (Body: `email`, `password`) — **anónimo** | `200 OK (AuthTokenResponse)`<br>`400 Bad Request (ProblemDetails)`<br>`401 Unauthorized (ProblemDetails)` | Autentica con correo y contraseña (RG-01, [ADR-0009](../Adr/0009-autenticacion-jwt-rg01.md)). El hash se compara en el servidor contra `PBKDF2-HMAC-SHA256`. Un correo inexistente, una contraseña incorrecta y un usuario bloqueado o eliminado responden **el mismo `401`**: distinguirlos permitiría enumerar cuentas registradas. Devuelve token JWT (60 min, `IClock`), su caducidad y la identidad. |
| `GET` | `/api/auth/me` | Query | token en cabecera | `200 OK (CurrentUserResponse)`<br>`401 Unauthorized (ProblemDetails)` | Devuelve la identidad que **declara el token ya validado** (`userId`, `email`, `fullName`, `role`); no consulta la base. Permite al cliente revalidar la sesión al arrancar sin guardar la identidad en otro sitio. |

### 3.1. Tag: `1. Usuarios y Roles` (`/api/users`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/users` | Command | `CreateUserCommand` (Body) — **anónimo solo si `role = Buyer` (`0`)** | `200 OK (Guid)`<br>`400 Bad Request (ProblemDetails)`<br>`403 Forbidden (ProblemDetails)` | Registra un nuevo usuario en el sistema. Valida unicidad de `Email` e `IdentityDocument` de forma asíncrona. Asigna roles válidos: `Buyer`, `Seller`, `Administrator`, `LogisticsOperator`, `Supervisor` (en el cuerpo JSON el rol viaja como **entero**, ver [3.3](#33-los-enum-del-contrato-viajan-como-número-en-el-cuerpo-json-q-22)). La contraseña viaja en claro y **el servidor calcula el hash**: el cliente nunca envía `PasswordHash`. Cualquier rol distinto de `Buyer` sin token de Administrador responde `403` (ZENTRIC.md Dominio 3: los vendedores no se auto-registran). |
| `GET` | `/api/users` | Query | `role` (Query param opcional) | `200 OK (List<UserDto>)` | Lista todos los usuarios registrados, permitiendo filtrar por rol (ej. `?role=Seller` o `?role=Buyer`). |
| `GET` | `/api/users/{id}` | Query | `id` (Path) | `200 OK (UserDto)`<br>`404 Not Found (ProblemDetails)` | Obtiene el detalle técnico y estado de un usuario por su ID. |

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
| `GET` | `/api/inventories/{variantId}` | Query | `variantId` (Path) | `200 OK (List<InventoryDto>)` | Consulta existencias distribuidas por bodega (disponible, reservado, usado, dañado) para un SKU/variante. |

---

### 3.4. Tag: `4. Catálogo de Productos` (`/api/catalog`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/catalog/products` | Command | `CreateProductCommand` (Body) | `200 OK (Guid)`<br>`400 Bad Request (ProblemDetails)` | Da de alta la ficha técnica de un producto en estado borrador (`Draft`) con dimensiones físicas y precio base. |
| `POST` | `/api/catalog/products/{id}/publish` | Command | `id` (Path) | `200 OK`<br>`400 Bad Request (ProblemDetails)` | Transita el estado del producto a `Published`, haciéndolo visible y adquirible por los compradores en el Marketplace. |
| `GET` | `/api/catalog/products` | Query | `vendorId` (Query param opcional) | `200 OK (List<ProductDto>)` | Consulta el catálogo de productos con sus variantes y precios, con filtro opcional por vendedor. |
| `GET` | `/api/catalog/products/{id}` | Query | `id` (Path) | `200 OK (ProductDto)`<br>`404 Not Found (ProblemDetails)` | Ficha técnica completa de un producto con sus variantes e identificadores de inventario. |

---

### 3.5. Tag: `5. Carrito y Órdenes` (`/api/orders`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/orders/cart` | Command | `CreateCartCommand` (Body) | `200 OK (Guid)`<br>`400 Bad Request (ProblemDetails)` | Inicializa una orden de compra en estado inicial `Cart` vinculada a un comprador (`BuyerId`). |
| `POST` | `/api/orders/cart/items` | Command | `AddOrderItemCommand` (Body) | `200 OK`<br>`400 Bad Request (ProblemDetails)` | Añade un producto al carrito verificando previamente existencias suficientes en el inventario disponible. |
| `POST` | `/api/orders/{orderId}/checkout` | Command | `orderId` (Path) | `200 OK`<br>`400 Bad Request (ProblemDetails)` | Cierra el carrito, reserva el stock en bodega, inicia el temporizador de expiración de 15 minutos y genera paquetes (`FulfillmentOrders`) agrupados por `VendorId`. |
| `POST` | `/api/orders/{orderId}/pay` | Command | `orderId` (Path) | `200 OK`<br>`400 Bad Request (ProblemDetails)` | Confirma la transacción económica exitosa, pasando el pedido a `Paid` y consolidando la reserva para despacho físico. |
| `GET` | `/api/orders/{id}` | Query | `id` (Path) | `200 OK (OrderDto)`<br>`404 Not Found (ProblemDetails)` | Consulta el estado del pedido (`Cart`, `PendingPayment`, `Paid`), total cancelado e ítems individuales. |

---

### 3.6. Tag: `6. Logística y Despacho` (`/api/logistics`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/logistics/fulfillment` | Command | `CreateFulfillmentOrderCommand` (Body) | `200 OK (Guid)`<br>`400 Bad Request (ProblemDetails)` | Crea una orden de preparación y empaque para los ítems pertenecientes a un vendedor y bodega específica. |
| `POST` | `/api/logistics/fulfillment/{id}/dispatch` | Command | `id` (Path) | `200 OK`<br>`400 Bad Request (ProblemDetails)` | Marca el paquete como `Dispatched` y descuenta formalmente el stock reservado de la bodega. |
| `POST` | `/api/logistics/fulfillment/cancel-ghost-stock` | Command | `CancelFulfillmentOrderDueToNoStockCommand` (Body) | `200 OK (Guid)`<br>`400 Bad Request (ProblemDetails)` | Reporta faltante físico en bodega (stock fantasma), cancela la orden de fulfillment y libera la reserva de existencias. |
| `GET` | `/api/logistics/fulfillment/{id}` | Query | `id` (Path) | `200 OK (FulfillmentOrderDto)`<br>`404 Not Found (ProblemDetails)` | Consulta el estado del despacho logístico, paquetes y números de guía (`TrackingNumber`). |

---

### 3.7. Tag: `7. Devoluciones y Garantías` (`/api/returns`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/returns/request` | Command | `RequestReturnCommand` (Body) | `200 OK (Guid)`<br>`400 Bad Request (ProblemDetails)` | Radica una solicitud de devolución para un producto entregado dentro del período de garantía legal. |
| `POST` | `/api/returns/{id}/inspect` | Command | `id` (Path), `InspectReturnRequestDto` (Body) | `200 OK`<br>`400 Bad Request (ProblemDetails)` | Registra la inspección física en bodega dictaminando si la mercancía está en buen estado o dañada. |
| `POST` | `/api/returns/{id}/approve` | Command | `id` (Path), `ApproveReturnCommand` (Body) | `200 OK`<br>`400 Bad Request (ProblemDetails)` | Aprueba comercialmente la devolución y dispara el evento de dominio `ReturnApprovedEvent` que reingresa el producto como stock usado (`UsedQuantity`). |
| `GET` | `/api/returns/{id}` | Query | `id` (Path) | `200 OK (ReturnRequestDto)`<br>`404 Not Found (ProblemDetails)` | Consulta el estado y dictamen de inspección técnica de una solicitud de devolución. |

---

### 3.8. Tag: `8. Facturación y Liquidación` (`/api/billing`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/billing/invoices/generate/{orderId}` | Command | `orderId` (Path) | `200 OK (bool)`<br>`400 Bad Request (ProblemDetails)` | Emite la Factura Maestra consolidada para el comprador, el detalle de comisión tecnológica para Zentric (`ZentricDetail`) y las facturas split para cada vendedor. |
| `GET` | `/api/billing/invoices/order/{orderId}` | Query | `orderId` (Path) | `200 OK (List<InvoiceDto>)` | Consulta todas las facturas emitidas asociadas a un pedido pagado. |

---

## 4. Disponibilidad y Consumo

- **Swagger UI Interactivo:** `http://localhost:5000/swagger` (o puerto local configurado).
- **Especificación OpenAPI JSON:** `http://localhost:5000/swagger/v1/swagger.json` listo para importación en Postman o generación de SDKs clientes para el frontend.
