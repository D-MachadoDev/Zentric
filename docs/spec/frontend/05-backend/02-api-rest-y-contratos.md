# Backend — Contrato REST/OpenAPI — Zentric

## 1. Reglas generales
- **JSON UTF-8**; contrato OpenAPI 3.1 versionado (`v1`) y revisado junto con el código.
- **Rutas y nombres** alineados con convenciones del repo. No inventar endpoints duplicados para acomodar frontend defectuoso.
- **DTO HTTP** se mantiene en el adaptador (Api); no atraviesa al dominio.
- **Auth y scope** documentados en cada operación (`security` + `x-scope`).
- **Listados** declaran filtros permitidos, ordenamiento, paginación (cursor/offset) y límites.
- **Mutaciones sensibles** declaran idempotencia (`Idempotency-Key` header) y semántica de reintento.
- **Generación**: `Swashbuckle.AspNetCore` + `Scalar` UI. CI valida `dotnet openapi` generate.

## 2. Forma de error (ProblemDetails RFC 7807)
```json
{
  "type": "https://zentric.com/errors/STABLE_MACHINE_CODE",
  "title": "Mensaje comprensible para usuario",
  "status": 4xx/5xx,
  "detail": "Detalle técnico opcional",
  "instance": "/api/v1/orders/...",
  "code": "STABLE_MACHINE_CODE",
  "details": [
    { "field": "quantity", "code": "MUST_BE_POSITIVE", "message": "La cantidad debe ser mayor a cero" }
  ],
  "correlationId": "opaque-request-id"
}
```
No devolver stack trace, SQL, tokens, secretos, ni URLs firmadas reutilizables.

## 3. Semántica HTTP orientativa
| Código | Uso |
|--------|-----|
| `200` | OK (query, command síncrono exitoso) |
| `201` | Created (command que crea recurso) — `Location` header |
| `202` | Accepted (command async, ej. workers) |
| `204` | No Content (delete, update sin body response) |
| `400` | JSON/formato inválido, validación estructural fallida |
| `401` | Sesión ausente/inválida/expirada |
| `403` | Actor autenticado sin capacidad (rol/scope/estado) |
| `404` | Recurso inexistente o no visible por scope (anti-enumeración) |
| `409` | Conflicto de estado, stock, idempotencia, concurrencia |
| `422` | Regla de negocio/validación semántica (cuando convención API lo apruebe) |
| `429` | Rate limit excedido |
| `500` | Fallo no esperado — incluir `correlationId` |
| `503` | Servicio dependiente caído (pago, storage) |

## 4. OpenAPI mínimo por endpoint
- `summary`, `tags`, `operationId` estable.
- `security` scheme (Bearer / Cookie).
- `parameters`: path/query/header/body con constraints (`minLength`, `pattern`, `minimum`, `enum`).
- `responses`: éxito + errores posibles (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`).
- `schemas` referenciados + `examples`.
- `x-scope`: regla de autorización (ej. `seller:own`, `logistics:assigned`, `admin:global`).
- `x-idempotency`: `required` / `optional` / `none`.
- `x-pagination`: `cursor` / `offset` / `none` + `maxLimit`.

## 5. Seguridad (OpenAPI components)
```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    CookieAuth:
      type: apiKey
      in: cookie
      name: zentric_access
  parameters:
    IdempotencyKey:
      name: Idempotency-Key
      in: header
      schema: { type: string, format: uuid }
      description: Clave idempotencia para mutaciones sensibles
## 6. Recursos principales a modelar (endpoints representativos)

### 6.1 Identity & Session
| Método | Ruta | Descripción | Auth | Scope |
|--------|------|-------------|------|-------|
| POST | `/api/v1/auth/register` | Registrar comprador | Anónimo | — |
| POST | `/api/v1/auth/login` | Login → cookies | Anónimo | — |
| POST | `/api/v1/auth/logout` | Logout | Cookie | Own |
| POST | `/api/v1/auth/refresh` | Refresh access token | Cookie (refresh) | — |
| GET | `/api/v1/auth/me` | Perfil + rol + entidad | Cookie | Own |
| POST | `/api/v1/auth/password/change` | Cambiar contraseña | Cookie | Own |
| POST | `/api/v1/auth/password/recovery/request` | Solicitar recovery | Anónimo | — |
| POST | `/api/v1/auth/password/recovery/confirm` | Confirmar recovery | Anónimo | — |

### 6.2 Sellers (Admin)
| Método | Ruta | Descripción | Auth | Scope |
|--------|------|-------------|------|-------|
| POST | `/api/v1/sellers` | Crear vendedor + 1ª bodega (tx) | Bearer | Admin |
| GET | `/api/v1/sellers` | Listar vendedores | Bearer | Admin/Supervisor |
| GET | `/api/v1/sellers/{id}` | Detalle vendedor | Bearer | Admin/Supervisor/Seller(own) |
| PATCH | `/api/v1/sellers/{id}` | Editar perfil tienda | Bearer | Admin/Seller(own) |
| PATCH | `/api/v1/sellers/{id}/status` | Activar/Inactivar | Bearer | Admin |

### 6.3 Warehouses
| Método | Ruta | Descripción | Auth | Scope |
|--------|------|-------------|------|-------|
| POST | `/api/v1/warehouses` | Crear bodega (Marketplace) | Bearer | Admin |
| POST | `/api/v1/sellers/{sellerId}/warehouses` | Crear bodega propia (Vendor) | Bearer | Admin/Seller(own) |
| GET | `/api/v1/warehouses` | Listar (filtros: type, active, vendor) | Bearer | Según scope |
| GET | `/api/v1/warehouses/{id}` | Detalle | Bearer | Según scope |
| PATCH | `/api/v1/warehouses/{id}` | Editar (location, type) | Bearer | Owner/Admin |
| PATCH | `/api/v1/warehouses/{id}/status` | Activar/Inactivar | Bearer | Owner/Admin |

### 6.4 Catalog (Products & Variants)
| Método | Ruta | Descripción | Auth | Scope |
|--------|------|-------------|------|-------|
| POST | `/api/v1/products` | Crear producto (Draft) | Bearer | Seller/Admin |
| GET | `/api/v1/products` | Listar público (Published) | Público/Opcional | Público |
| GET | `/api/v1/products?scope=mine` | Listar propios (todos estados) | Bearer | Seller/Admin |
| GET | `/api/v1/products/{id}` | Detalle | Bearer/Público | Según estado/scope |
| PATCH | `/api/v1/products/{id}` | Editar (nombre, desc, precio, img, cat, tipo) | Bearer | Seller(own)/Admin |
| POST | `/api/v1/products/{id}/publish` | Publicar | Bearer | Seller(own)/Admin |
| POST | `/api/v1/products/{id}/suspend` | Suspender | Bearer | Seller(own)/Admin |
| POST | `/api/v1/products/{id}/discontinue` | Descontinuar (soft delete) | Bearer | Seller(own)/Admin |
| POST | `/api/v1/products/{id}/restore` | Restaurar | Bearer | Seller(own)/Admin |
| POST | `/api/v1/products/{id}/variants` | Agregar variante | Bearer | Seller(own)/Admin |
| PATCH | `/api/v1/variants/{variantId}` | Editar variante (SKU, precio, attrs) | Bearer | Seller(own)/Admin |
| POST | `/api/v1/variants/{variantId}/activate` | Activar | Bearer | Seller(own)/Admin |
| POST | `/api/v1/variants/{variantId}/deactivate` | Desactivar | Bearer | Seller(own)/Admin |
| DELETE | `/api/v1/variants/{variantId}` | Soft delete variante | Bearer | Seller(own)/Admin |

### 6.5 Inventory
| Método | Ruta | Descripción | Auth | Scope |
|--------|------|-------------|------|-------|
| POST | `/api/v1/inventory/add-stock` | AddStock (variantId, warehouseId, qty) | Bearer | Seller(own+Marketplace)/Admin |
| GET | `/api/v1/inventory` | Listar existencias (filtros: variant, warehouse) | Bearer | Seller/Logistics/Admin |
| GET | `/api/v1/inventory/{variantId}/{warehouseId}` | Detalle posición | Bearer | Según scope |
| POST | `/api/v1/inventory/adjust` | Ajuste por conteo (motivo, nuevo valor) | Bearer | Seller(own)/Admin |
| POST | `/api/v1/inventory/transfer` | Traslado (ABIERTO INC-06) | Bearer | ABIERTO |
| GET | `/api/v1/inventory/{variantId}/movements` | Auditoría movimientos | Bearer | Seller(own)/Admin |

### 6.6 Cart & Checkout (Buyer)
| Método | Ruta | Descripción | Auth | Scope |
|--------|------|-------------|------|-------|
| GET | `/api/v1/cart` | Ver carrito (CustomerOrder Cart) | Cookie | Buyer(own) |
### 6.7 Payments (Simulado V1)
| Método | Ruta | Descripción | Auth | Scope |
|--------|------|-------------|------|-------|
| POST | `/api/v1/payments/attempts` | Iniciar intento de pago (idempotent) | Cookie | Buyer(own) |
| GET | `/api/v1/payments/attempts/{id}` | Estado intento | Cookie | Buyer(own)/Admin |
| POST | `/api/v1/payments/webhook` | Webhook proveedor (futuro) | Bearer (provider) | Sistema |

### 6.8 Orders (Multi-scope)
| Método | Ruta | Descripción | Auth | Scope |
|--------|------|-------------|------|-------|
| GET | `/api/v1/orders/{id}` | Detalle completo | Cookie/Bearer | Buyer/Seller/Logistics/Admin |
| POST | `/api/v1/orders/{id}/cancel` | Cancelar (Cart/PendingPayment) | Cookie/Bearer | Buyer(own)/Admin |
| POST | `/api/v1/orders/{id}/cancel-post-payment` | Cancelar post-pago (INC-02) | Bearer | ABIERTO |

### 6.9 Logistics (FulfillmentOrders)
| Método | Ruta | Descripción | Auth | Scope |
|--------|------|-------------|------|-------|
| GET | `/api/v1/fulfillments` | Cola (filtros: status, warehouse, dates, assigned) | Bearer | Logistics/Seller/Admin |
| GET | `/api/v1/fulfillments/{id}` | Detalle | Bearer | Según scope |
| POST | `/api/v1/fulfillments/{id}/pack` | Pack → Packed | Bearer | Seller(own)/Logistics/Admin |
| POST | `/api/v1/fulfillments/{id}/dispatch` | Dispatch → Dispatched + tracking | Bearer | Seller(own)/Logistics/Admin |
| POST | `/api/v1/fulfillments/{id}/deliver` | Deliver → Delivered | Bearer | Seller(own)/Logistics/Admin |
| POST | `/api/v1/fulfillments/{id}/cancel` | Cancelar (StockBreak) | Bearer | Logistics/Admin |

### 6.10 Billing (Invoices)
| Método | Ruta | Descripción | Auth | Scope |
|--------|------|-------------|------|-------|
| GET | `/api/v1/invoices/{id}` | Detalle factura | Bearer | Según tipo/scope |
| GET | `/api/v1/invoices` | Listar (filtros: type, order, dates) | Bearer | Según scope |

### 6.11 Returns
| Método | Ruta | Descripción | Auth | Scope |
|--------|------|-------------|------|-------|
| POST | `/api/v1/returns` | Solicitar devolución | Cookie | Buyer(own) |
| GET | `/api/v1/returns` | Listar (scope) | Bearer/Cookie | Buyer/Seller/Logistics/Admin |
| GET | `/api/v1/returns/{id}` | Detalle | Bearer/Cookie | Según scope |
| POST | `/api/v1/returns/{id}/inspect` | Inspeccionar (logistics) | Bearer | Logistics(assigned)/Admin |
| POST | `/api/v1/returns/{id}/approve` | Aprobar (seller) | Bearer | Seller(own)/Admin |
| POST | `/api/v1/returns/{id}/reject` | Rechazar (seller) | Bearer | Seller(own)/Admin |

### 6.12 Reports & Supervision (Admin/Supervisor)
| Método | Ruta | Descripción | Auth | Scope |
|--------|------|-------------|------|-------|
| GET | `/api/v1/reports/sales` | Ventas (filtros, granularidad) | Bearer | Admin/Supervisor |
| GET | `/api/v1/reports/orders` | Pedidos | Bearer | Admin/Supervisor |
| GET | `/api/v1/reports/inventory` | Inventario | Bearer | Admin/Supervisor |
| GET | `/api/v1/reports/logistics` | Cumplimiento logístico | Bearer | Admin/Supervisor |
| GET | `/api/v1/audit/orders/{id}` | Auditoría 360° pedido | Bearer | Admin/Supervisor |
| GET | `/api/v1/audit/ledger` | Libro mayor tributario | Bearer | Admin/Supervisor |

## 7. Paginación
- **Cursor** (default): `?cursor=opaque&limit=20` → response `{ items: [], nextCursor: "..." }`. Para listas grandes, feeds, auditoría.
- **Offset** (admin/reportes): `?page=1&pageSize=50` → response `{ items: [], total: 1234, page: 1, pageSize: 50 }`.
- Especificar por endpoint en OpenAPI (`x-pagination`).

## 8. Filtros y ordenamiento estándar
- Convención: `?filter[field]=value&filter[field][op]=gte&sort=-createdAt,status`.
- Operadores: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `contains`, `startsWith`.
- Documentar campos permitidos por endpoint en OpenAPI (`x-filters`).

## 9. Versionado y evolución
- URL versionada: `/api/v1/...`.
- Cambios breaking → `v2` (nuevo major). Cambios additive → mismo `v1` (nuevo minor en OpenAPI info.version).
- Deprecación: header `Sunset` + `Deprecation: true` en responses + aviso 3 meses.

## 10. Testing de contrato
- **Provider**: Tests de integración validan schema OpenAPI vs responses reales.
- **Consumer**: Frontend genera tipos (`orval`/`openapi-typescript`) y valida en CI.
- **Contract tests**: Pact (consumer-driven) para flujos críticos (checkout, logistics, returns).
| POST | `/api/v1/cart/items` | Agregar item | Cookie | Buyer(own) |
| PATCH | `/api/v1/cart/items/{variantId}` | Actualizar cantidad | Cookie | Buyer(own) |
| DELETE | `/api/v1/cart/items/{variantId}` | Quitar item | Cookie | Buyer(own) |
| POST | `/api/v1/checkout` | Checkout → PendingPayment + reservas | Cookie | Buyer(own) |
| GET | `/api/v1/orders/{id}` | Detalle pedido | Cookie | Según scope |
| GET | `/api/v1/orders` | Listar pedidos (filtros, cursor) | Cookie | Según scope |
    CorrelationId:
      name: X-Correlation-ID
      in: header
      schema: { type: string }
      description: Propagado por middleware, obligatorio en logs
```
