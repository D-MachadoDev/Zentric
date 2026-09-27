# Capa de Presentación - Endpoints API y Especificación OpenAPI / Swagger

Este documento define la especificación oficial (SSoT) de la capa de presentación de `Zentric.Api`, documentada interactivamente a través de **Swagger UI** (`/swagger`) y exportable como especificación **OpenAPI v1** (`/swagger/v1/swagger.json`).

---

## 1. Configuración de Seguridad y Esquema Bearer (OpenAPI)

Conforme a **ZENTRIC.md, sección 3.2**, los mecanismos de autenticación técnica y sesiones web están fuera del alcance funcional central inicial del dominio. Sin embargo, para permitir la integración profesional con el frontend, pruebas de integración y colecciones de Postman:

- **Esquema de Seguridad:** `Bearer` (tipo HTTP, formato JWT).
- **Cabecera HTTP:** `Authorization: Bearer <token>`.
- **Swagger UI:** Dispone del botón interactivo **Authorize** configurado globalmente mediante `AddSecurityDefinition` y `AddSecurityRequirement`.
- **Comportamiento en esta fase:** Las rutas están abiertas a nivel de autorización técnica en desarrollo para facilitar la prueba de los 10 módulos de negocio, quedando preparadas para asociar `[Authorize]` y políticas RBAC basadas en los roles de `ZENTRIC.md`, sección 5 (`Buyer`, `Vendor`, `Admin`, `LogisticsOperator`, `Supervisor`) cuando se formalice el módulo técnico de Auth.

---

## 2. Patrón Global de Respuestas y Manejo de Errores

Todos los controladores heredan o implementan contratos HTTP RESTful con formato `application/json` y `application/problem+json`:

- **Éxito (200 OK):** Retorna el identificador `Guid` generado, el DTO de consulta correspondiente o `200 OK` vacío en comandos de mutación.
- **Fallo de Validación o Negocio (400 Bad Request):** Respuestas mapeadas obligatoriamente al estándar **RFC 7807 (Problem Details)**:
  ```json
  {
    "type": "https://tools.ietf.org/html/rfc7807",
    "title": "Bad Request",
    "status": 400,
    "detail": "Descripción de la invariante violada o error de validación."
  }
  ```
- **Recurso no Encontrado (404 Not Found):** Respuestas RFC 7807 cuando un identificador de consulta no existe en el sistema.
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

Todavía **no hay autenticación JWT** (decisión pendiente del Owner). Mientras tanto, el
comprador se declara en la cabecera **`X-Buyer-Id`**, y el backend la resuelve en
`HeaderBuyerAccessor`. Cuando exista JWT, ese mismo accesor pasa a leer el claim
(`NameIdentifier` o `sub`) y **no cambia ningún otro archivo**: la cabecera queda como
fallback para desarrollo.

`GET /api/Orders/{id}` sí está aislado: usa `GetOrderByIdForBuyerQuery`, que filtra por
`BuyerId` **en la consulta**, no después de leer el pedido.

| Situación | Respuesta |
|---|---|
| El comprador dueño, con `X-Buyer-Id` válido | `200 OK` con el pedido |
| Un comprador distinto al dueño | `404 Not Found` (mismo mensaje que si no existiera) |
| Sin cabecera y sin identidad autenticada | `401 Unauthorized` |

> El mismo mensaje para "no existe" y "no es tuyo" es deliberado: distinguirlos
> permitiría enumerar pedidos ajenos probando GUIDs.

El frontend debe enviar `X-Buyer-Id` en todas las llamadas de pedidos mientras no
exista JWT.

---

## 4. Catálogo Detallado de Endpoints por Bounded Context (Tags de Swagger)

### 3.1. Tag: `1. Usuarios y Roles` (`/api/users`)
| Método | Endpoint | Tipo CQRS | Entrada / Payload | Respuestas | Descripción de Negocio e Invariantes |
|---|---|:---:|---|---|---|
| `POST` | `/api/users` | Command | `CreateUserCommand` (Body) | `200 OK (Guid)`<br>`400 Bad Request (ProblemDetails)` | Registra un nuevo usuario en el sistema. Valida unicidad de `Email` e `IdentityDocument` de forma asíncrona. Asigna roles válidos: `Buyer`, `Seller`, `Administrator`, `LogisticsOperator`, `Supervisor`. |
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
