# Presentación — Endpoints API y Especificación OpenAPI

> Especificación canónica y contrato REST oficial de la API de Zentric (`Zentric.Api`), documentada interactivamente a través de Swagger UI (`/swagger`) y expuesta mediante el esquema OpenAPI v1 (`/swagger/v1/swagger.json`).

---

## 1. Principios de Seguridad y Políticas de Acceso

La API implementa un modelo de autenticación y autorización basado en tokens Bearer JWT (*JSON Web Tokens*) que cumple con la regla de seguridad del negocio: **toda operación debe ejecutarse por un usuario autenticado y autorizado**:

- **Esquema de Seguridad:** `Bearer` (tipo HTTP, formato JWT, firmado simétricamente mediante HMAC-SHA256).
- **Cabecera HTTP Requerida:** `Authorization: Bearer <token>`, obtenido exclusivamente mediante `POST /api/auth/login`.
- **Política de Reserva (*Fallback Policy*):** Por defecto, **todo endpoint nace cerrado y exige autenticación**. No es necesario decorar cada controlador individualmente; una solicitud sin cabecera de autenticación válida es rechazada inmediatamente con `401 Unauthorized` por el pipeline de ASP.NET Core.
- **Excepciones Anónimas Explícitas (`[AllowAnonymous]`):**
  1. `POST /api/auth/login`: Endpoint de ingreso para solicitar el token de sesión.
  2. `POST /api/users` *(únicamente cuando `role = "Buyer"`)*: Registro público de nuevos compradores.
  3. `GET /health`: Sonda de verificación de salud para Docker, balanceadores y herramientas de monitoreo.
- **Ciclo de Vida del Token:** Vigencia de 60 minutos calculada mediante el puerto del dominio `IClock`. No se emiten tokens de refresco (*refresh tokens*).
- **Prohibición de Cabeceras Forjables:** La cabecera histórica `X-Buyer-Id` ha sido completamente eliminada. La identidad del llamante se deriva exclusivamente del claim `sub` del token validado criptográficamente en el servidor.
- **Contrato de Enumeraciones Estricto:** Los cuerpos JSON de las solicitudes solo aceptan los nombres canónicos de los enumeradores como cadenas de texto (ej. `"Buyer"`, `"Physical"`, `"Vendor"`). Enviar enteros numéricos produce un fallo inmediato de validación `400 Bad Request`.
- **Configuración de CORS:** Política restrictiva con lista explícita de orígenes autorizados (`Cors:AllowedOrigins`), prohibiendo el comodín abierto (`*`) para salvaguardar los tokens de seguridad.

---

## 2. Contrato de Respuestas y Manejo Uniforme de Errores

Todos los controladores emiten respuestas HTTP estandarizadas bajo los formatos `application/json` y `application/problem+json`:

- **Operación Exitosa (200 OK):**
  - En comandos de creación: Retorna el identificador único `Guid` generado o el DTO resultante.
  - En comandos de mutación de estado: Retorna `200 OK` con confirmación o cuerpo vacío.
  - En consultas (Queries): Retorna el DTO de respuesta o la lista tipada.
- **Fallo de Validación o Regla de Negocio (400 Bad Request):**
  - Respuestas estructuradas bajo el estándar **RFC 7807 (Problem Details)** servidas con tipo de contenido `application/problem+json`:
    ```json
    {
      "type": "https://tools.ietf.org/html/rfc7807",
      "title": "Bad Request",
      "status": 400,
      "detail": "Descripción de la regla de negocio violada o del error de validación de entrada."
    }
    ```
- **Falta de Autenticación (401 Unauthorized):** Token ausente, alterado, expirado o credenciales inválidas.
- **Acceso No Autorizado por Rol (403 Forbidden):** El usuario posee un token válido pero carece del rol exigido por la política del endpoint.
- **Recurso No Encontrado o Ajeno (404 Not Found):** Emitido cuando el identificador no existe en la base de datos **o cuando pertenece a otro usuario**. Este comportamiento deliberado previene la enumeración de identificadores de clientes ajenos.
- **Error Crítico de Infraestructura (500 Internal Server Error):** Interceptado por el middleware global de excepciones (`app.UseExceptionHandler()`), evitando exponer cadenas de conexión, trazas de SQL o excepciones técnicas al cliente.

---

## 3. Paginación y Filtrado de Consultas

Las consultas con gran volumen de registros soportan parámetros de paginación uniforme `page` y `size` y retornan una envoltura estandarizada `PagedResult<T>`:

- `page`: Índice basado en cero (la primera página es `0`). Valores menores a cero se normalizan a `0`.
- `size`: Tamaño de página (por defecto `20`, máximo `100`).
- **Estructura de Respuesta Paginada:**
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
- El cálculo de `totalItems` se ejecuta a nivel de base de datos antes de aplicar el desplazamiento (`Skip`/`Take`), garantizando conteos precisos para los componentes de interfaz de usuario.

---

## 4. Catálogo Canónico de Endpoints (45 Endpoints)

### 4.1 Módulo 0: Autenticación e Identidad (`/api/auth`)

| Método | Endpoint | Tipo CQRS | Payload / Parámetros | Respuestas HTTP | Descripción de Negocio y Reglas |
|---|---|:---:|---|---|---|
| `POST` | `/api/auth/login` | Command | Body: `{ email, password }` | `200 OK (AuthTokenResponse)`<br>`400 Bad Request`<br>`401 Unauthorized` | Autentica un usuario mediante su correo y contraseña. El servidor compara el hash utilizando el algoritmo PBKDF2-HMAC-SHA256 con salt criptográfico. Credenciales erróneas, usuarios inexistentes o bloqueados responden un `401` idéntico para evitar enumeración de cuentas. |
| `GET` | `/api/auth/me` | Query | Cabecera `Authorization: Bearer` | `200 OK (CurrentUserResponse)`<br>`401 Unauthorized` | Resuelve la identidad y el rol directamente a partir de las declaraciones (*claims*) del token JWT ya validado sin ejecutar consultas innecesarias a la base de datos. |

---

### 4.2 Módulo 1: Usuarios y Gestión de Acceso (`/api/users`)

| Método | Endpoint | Tipo CQRS | Payload / Parámetros | Respuestas HTTP | Descripción de Negocio y Reglas |
|---|---|:---:|---|---|---|
| `POST` | `/api/users` | Command | Body: `{ identityDocument, fullName, email, password, role }` | `200 OK (Guid)`<br>`400 Bad Request`<br>`403 Forbidden` | Da de alta un nuevo usuario. Permite acceso anónimo exclusivamente para el rol Comprador (`Buyer`). Para cualquier otro rol (Vendedor, Administrador, etc.), exige token de Administrador. Valida unicidad de correo y documento de identidad. |
| `GET` | `/api/users` | Query | Query: `role?` | `200 OK (List<UserDto>)`<br>`401 Unauthorized`<br>`403 Forbidden` | Lista todos los usuarios registrados en el sistema, permitiendo el filtrado opcional por rol. Requiere política `UserAdministration` o `SupervisorAudit`. |
| `GET` | `/api/users/{id}` | Query | Path: `id` | `200 OK (UserDto)`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Consulta la ficha técnica, correo, rol y estado operativo de un usuario por su identificador. |
| `POST` | `/api/users/{id}/block` | Command | Path: `id` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Bloquea el acceso de un usuario al sistema. Impide la autenticación futura y prohíbe que sus productos puedan comprarse en checkout. No altera pedidos ya pagados ni despachos en tránsito. Exclusivo para Administrador. |
| `POST` | `/api/users/{id}/activate` | Command | Path: `id` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Reactiva el acceso de un usuario previamente suspendido o bloqueado, restituyendo sus facultades operativas de manera inmediata. Exclusivo para Administrador. |

---

### 4.3 Módulo 2: Bodegas y Centros de Almacenamiento (`/api/warehouses`)

| Método | Endpoint | Tipo CQRS | Payload / Parámetros | Respuestas HTTP | Descripción de Negocio y Reglas |
|---|---|:---:|---|---|---|
| `POST` | `/api/warehouses` | Command | Body: `{ name, location, capacity, type, vendorId? }` | `200 OK (Guid)`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` | Registra una nueva bodega física de almacenamiento especificando nombre, dirección, capacidad volumétrica ($m^3$) y tipo (propia de Zentric o de vendedor). |
| `GET` | `/api/warehouses` | Query | Query: `vendorId?` | `200 OK (List<WarehouseDto>)`<br>`401 Unauthorized`<br>`403 Forbidden` | Lista todas las bodegas activas del sistema, con capacidad de filtrar por las pertenecientes a un vendedor particular. |
| `GET` | `/api/warehouses/{id}` | Query | Path: `id` | `200 OK (WarehouseDto)`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Obtiene la información técnica, dirección y capacidad volumétrica total de una bodega específica. |

---

### 4.4 Módulo 3: Inventarios y Control de Stock (`/api/inventories`)

| Método | Endpoint | Tipo CQRS | Payload / Parámetros | Respuestas HTTP | Descripción de Negocio y Reglas |
|---|---|:---:|---|---|---|
| `POST` | `/api/inventories/stock` | Command | Body: `{ variantId, warehouseId, quantity, isUsed }` | `200 OK (Guid)`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` | Ingresa existencias físicas para una variante en una bodega, clasificando explícitamente entre unidades nuevas y reacondicionadas/usadas. |
| `GET` | `/api/inventories` | Query | Cabecera `Authorization: Bearer` | `200 OK (List<InventoryDto>)`<br>`401 Unauthorized`<br>`403 Forbidden` | Lista los inventarios con aislamiento estricto por rol: un vendedor solo ve sus existencias, mientras que el administrador, operador y supervisor acceden al inventario consolidado. |
| `GET` | `/api/inventories/{variantId}` | Query | Path: `variantId` | `200 OK (List<InventoryDto>)`<br>`401 Unauthorized`<br>`403 Forbidden` | Consulta las existencias distribuidas por bodega (disponible, reservado, usado y dañado) para un código SKU/variante específico. |
| `POST` | `/api/inventories/{id}/adjust` | Command | Path: `id`, Body: `{ countedQuantity, reason }` | `200 OK (AdjustInventoryResult)`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Registra un ajuste de inventario por conteo físico en bodega. El conteo solo puede disminuir existencias disponibles (no crear stock artificial). Registra auditoría e implementa idempotencia ante reintentos. Exclusivo para Administrador y Supervisor. |

---

### 4.5 Módulo 4: Catálogo de Productos (`/api/catalog`)

| Método | Endpoint | Tipo CQRS | Payload / Parámetros | Respuestas HTTP | Descripción de Negocio y Reglas |
|---|---|:---:|---|---|---|
| `POST` | `/api/catalog/products` | Command | Body: `CreateProductCommand` | `200 OK (CreatedProductDto)`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` | Da de alta un nuevo producto con precio, dimensiones físicas y variantes obligatorias si es físico. El producto nace publicado automáticamente (`Published`). Exclusivo para Vendedores. |
| `POST` | `/api/catalog/products/{productId}/publish` | Command | Path: `productId` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Reactiva un producto que se encontraba suspendido, devolviéndolo al catálogo activo visible y adquirible para los compradores. |
| `POST` | `/api/catalog/products/{productId}/suspend` | Command | Path: `productId` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Suspende temporalmente un producto. Deja de aparecer en las búsquedas públicas y se prohíbe su adición a carritos de compra. Los pedidos previamente pagados no sufren afectación. |
| `GET` | `/api/catalog/products` | Query | Query: `vendorId?` | `200 OK (List<ProductDto>)` | Consulta el catálogo público. Por regla general solo expone productos en estado `Published`. Si un vendedor consulta sus propios productos, se incluyen también los suspendidos para permitir su gestión. |
| `GET` | `/api/catalog/products/paged` | Query | Query: `vendorId?`, `page`, `size` | `200 OK (PagedResult<ProductDto>)`<br>`400 Bad Request` | Versión paginada del catálogo de productos con metadatos de navegación (`totalItems`, `totalPages`, etc.), aplicando las mismas reglas de visibilidad que el listado simple. |
| `GET` | `/api/catalog/products/{id}` | Query | Path: `id` | `200 OK (ProductDto)`<br>`404 Not Found` | Consulta la ficha técnica completa de un producto por su identificador único. |

---

### 4.6 Módulo 5: Carrito y Pedidos de Compra (`/api/orders`)

| Método | Endpoint | Tipo CQRS | Payload / Parámetros | Respuestas HTTP | Descripción de Negocio y Reglas |
|---|---|:---:|---|---|---|
| `POST` | `/api/orders/cart` | Command | Sin cuerpo *(identidad desde token)* | `200 OK (Guid)`<br>`401 Unauthorized`<br>`403 Forbidden` | Inicializa un nuevo pedido en estado `Cart` vinculado estrictamente a la identidad del comprador autenticado. |
| `POST` | `/api/orders/cart/items` | Command | Body: `{ orderId, variantId, quantity }` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` | Agrega un producto al carrito de compras verificando que el pedido pertenezca al llamante, que la variante exista y que el producto sea comercialmente vendible. Congela el precio unitario vigente. |
| `POST` | `/api/orders/{orderId}/checkout` | Command | Path: `orderId` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` | Cierra el carrito, reserva existencias físicas en las bodegas con menor carga operativa, activa la ventana de espera de 15 minutos y genera las órdenes logísticas preliminares. |
| `POST` | `/api/orders/{orderId}/pay` | Command | Path: `orderId` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` | Procesa el recaudo mediante la pasarela de pagos. Al confirmarse, consolida la reserva de inventario, genera el comprobante de recaudo y transiciona el pedido a estado pagado (`Paid`). |
| `GET` | `/api/orders` | Query | Query: `status?` | `200 OK (List<OrderListItemDto>)`<br>`400 Bad Request`<br>`401 Unauthorized` | Consulta la lista de pedidos con aislamiento forzado en base de datos: el comprador solo ve sus compras, el vendedor solo ve líneas donde es propietario (con montos propios y sin datos ajenos), y los roles administrativos ven la totalidad. |
| `GET` | `/api/orders/{id}` | Query | Path: `id` | `200 OK (OrderDto \| SellerOrderViewDto)`<br>`401 Unauthorized`<br>`404 Not Found` | Retorna el detalle del pedido. La representación varía según el rol: el vendedor recibe una vista restringida con sus líneas y subtotales; el comprador dueño y la administración reciben el pedido consolidado. |

---

### 4.7 Módulo 6: Logística y Órdenes de Despacho (`/api/logistics`)

| Método | Endpoint | Tipo CQRS | Payload / Parámetros | Respuestas HTTP | Descripción de Negocio y Reglas |
|---|---|:---:|---|---|---|
| `POST` | `/api/logistics/fulfillment` | Command | Body: `CreateFulfillmentOrderCommand` | `200 OK (Guid)`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` | Crea manualmente una orden logística de despacho para ítems específicos pertenecientes a una bodega y vendedor determinados. |
| `POST` | `/api/logistics/fulfillment/{id}/pack` | Command | Path: `id` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Transiciona la orden de empaque de `PendingPack` a `Packed`. El vendedor solo puede empacar sus propias órdenes; el operador logístico puede empacar cualquier orden en bodega. |
| `POST` | `/api/logistics/fulfillment/{id}/dispatch` | Command | Path: `id` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Marca el paquete como despachado (`Dispatched`), asigna la guía de transporte y descuenta definitivamente las unidades de stock reservado. |
| `POST` | `/api/logistics/fulfillment/{id}/deliver` | Command | Path: `id` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Certifica la entrega física del paquete al comprador (`Delivered`). **Exclusivo para el Operador Logístico**; el vendedor tiene estrictamente prohibido certificar la entrega de sus propios despachos. |
| `POST` | `/api/logistics/fulfillment/cancel-ghost-stock` | Command | Body: `CancelFulfillmentOrderDueToNoStockCommand` | `200 OK (Guid)`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` | Reporta un faltante físico no detectado previamente en bodega (*stock fantasma*). Cancela la orden logística, libera reservas y genera automáticamente una devolución con reembolso a favor del comprador. |
| `GET` | `/api/logistics/fulfillments` | Query | Query: `status?` | `200 OK (List<FulfillmentOrderDto>)`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` | Lista las órdenes logísticas aplicando aislamiento de consulta por rol: el vendedor solo visualiza sus despachos, mientras que el operador logístico y la administración consultan la cola general. |
| `GET` | `/api/logistics/fulfillment/{id}` | Query | Path: `id` | `200 OK (FulfillmentOrderDto)`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Consulta la ficha de despacho, paquetes asociados, transportadora y códigos de guía (*tracking number*). |

---

### 4.8 Módulo 7: Devoluciones y Garantías (`/api/returns`)

| Método | Endpoint | Tipo CQRS | Payload / Parámetros | Respuestas HTTP | Descripción de Negocio y Reglas |
|---|---|:---:|---|---|---|
| `POST` | `/api/returns/request` | Command | Body: `RequestReturnCommand` | `200 OK (Guid)`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`404 Not Found` | Radica una solicitud de devolución para un producto entregado dentro del plazo de garantía. El sistema valida automáticamente que el producto sea físico y que la bodega de recepción exista. |
| `POST` | `/api/returns/{id}/inspect` | Command | Path: `id`, Body: `InspectReturnRequestDto` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Registra el dictamen de la inspección técnica en bodega (mercancía en buen estado o dañada). Ejecutable por el Operador Logístico o el Vendedor según la ubicación física. |
| `POST` | `/api/returns/{id}/approve` | Command | Path: `id` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Aprueba comercialmente la devolución. Dispara el reingreso del producto al inventario como mercancía reacondicionada o usada. **Exclusivo para el Vendedor dueño del producto**. |
| `POST` | `/api/returns/{id}/reject` | Command | Path: `id` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Rechaza la solicitud de devolución si el producto no cumple las condiciones de garantía. **Exclusivo para el Vendedor dueño del producto**. |
| `POST` | `/api/returns/{id}/refund` | Command | Path: `id` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Ejecuta la liquidación económica del reembolso para una devolución previamente aprobada, acreditando el valor correspondiente. **Exclusivo para el Administrador**. |
| `GET` | `/api/returns` | Query | Query: `status?` | `200 OK (List<ReturnRequestDto>)`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` | Lista las solicitudes de devolución aplicando aislamiento por rol: el comprador ve sus solicitudes, el vendedor ve las radicadas contra sus productos y la administración supervisa la bandeja total. |
| `GET` | `/api/returns/{id}` | Query | Path: `id` | `200 OK (ReturnRequestDto)`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Consulta el expediente completo de una devolución, incluyendo dictámenes de inspección técnica y resoluciones comerciales. |

---

### 4.9 Módulo 8: Facturación y Liquidación Tributaria (`/api/billing`)

| Método | Endpoint | Tipo CQRS | Payload / Parámetros | Respuestas HTTP | Descripción de Negocio y Reglas |
|---|---|:---:|---|---|---|
| `POST` | `/api/billing/invoices/generate/{orderId}` | Command | Path: `orderId` | `200 OK (bool)`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` | Emite la Factura Maestra consolidada para el comprador, el desglose interno de comisión para Zentric y las facturas individuales para cada vendedor involucrado. Requiere que el pedido esté pagado y no haya sido facturado previamente. **Exclusivo para el Administrador**. |
| `POST` | `/api/billing/invoices/annul/{orderId}` | Command | Path: `orderId`, Body: `{ reason }` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Anula formalmente la Factura Maestra de un pedido ante reversiones de pago o cancelaciones post-recaudo, registrando el motivo y la marca temporal de anulación. Las facturas de detalle no se anulan. **Exclusivo para el Administrador**. |
| `GET` | `/api/billing/invoices` | Query | Cabecera `Authorization: Bearer` | `200 OK (List<InvoiceDto>)`<br>`401 Unauthorized`<br>`403 Forbidden` | Lista las facturas emitidas con aislamiento de seguridad: el vendedor solo visualiza sus facturas de detalle (*VendorDetail*), mientras que el administrador y el supervisor acceden a la totalidad de comprobantes. El operador logístico carece de acceso a este módulo. |
| `GET` | `/api/billing/invoices/order/{orderId}` | Query | Path: `orderId` | `200 OK (List<InvoiceDto>)`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` | Consulta todas las facturas tributarias emitidas y vinculadas a un pedido de compra pagado. |

---

### 4.10 Módulo 9: Infraestructura y Disponibilidad (`/health`)

| Método | Endpoint | Tipo CQRS | Payload / Parámetros | Respuestas HTTP | Descripción de Negocio y Reglas |
|---|---|:---:|---|---|---|
| `GET` | `/health` | Sonda Técnica | Sin cabeceras ni parámetros *(Acceso Anónimo)* | `200 OK (Healthy / Degraded)`<br>`503 Service Unavailable (Unhealthy)` | Sonda de salud integral del sistema. Verifica en tiempo real tanto la ejecución del proceso web de ASP.NET Core como la conectividad activa hacia el motor PostgreSQL. Utilizada por el healthcheck de Docker y balanceadores de carga. |

---

## 5. Disponibilidad y Consumo de la Especificación

- **Swagger UI Interactivo:** Disponible en entorno de desarrollo en `http://localhost:5076/swagger`.
- **Manifiesto OpenAPI JSON:** Exportable directamente desde `http://localhost:5076/swagger/v1/swagger.json` para generación automatizada de clientes HTTP y pruebas de contrato.
