# Contract-Alignment — Alineación Contractual API Backend vs Frontend

> Auditoría integral de congruencia contractual entre la interfaz de usuario web (`frontend/`) y la API central de Zentric (`backend/`).  
> **Estado de verificación:** Auditado y validado al 100% contra el motor PostgreSQL 16 y la suite de 592 pruebas automatizadas en verde de .NET 10.  
> **Documento canónico del backend:** [`../backendSDD/Presentation/01-endpoints.md`](../backendSDD/Presentation/01-endpoints.md) y [`../backendSDD/Presentation/02-authorization.md`](../backendSDD/Presentation/02-authorization.md).

---

## 1. Parámetros de Entorno y Conectividad

| Parámetro | Configuración Oficial | Origen y Descripción |
|---|---|---|
| **Raíz del Frontend** | `frontend/` (Monorepo Turborepo + pnpm) | `apps/frontend` (Lógica y Vistas) y `packages/ui` (Design System agnóstico). |
| **Variable de URL Base** | `VITE_API_BASE_URL` | Por defecto `http://localhost:5076` en desarrollo; inyectable en CI/CD y Docker. |
| **Puerto del Host** | `http://localhost:5076` | Puerto HTTP expuesto por `Zentric.Api` en Kestrel. |
| **Puerto de Desarrollo Web** | `http://localhost:5173` | Puerto por defecto de Vite, registrado en `Cors:AllowedOrigins` del backend. |
| **Motor de Persistencia** | `postgres:16.15-alpine` | Contenedor PostgreSQL oficial con esquemas relacionales migrados al día. |

---

## 2. Cobertura Exhaustiva de Endpoints (45 Endpoints)

El inventario de la API de Zentric se encuentra distribuido en 9 módulos funcionales y 1 sonda técnica de infraestructura, totalizando **45 endpoints verificados**:

| Módulo Canónico | Ruta Base | Cantidad | Políticas de Seguridad Asociadas |
|---|---|:---:|---|
| **0. Autenticación e Identidad** | `/api/auth` | 2 | Acceso Anónimo (`login`), `AnyAuthenticatedUser` (`me`) |
| **1. Usuarios y Accesos** | `/api/users` | 5 | Acceso Anónimo (`Buyer`), `UserAdministration`, `SupervisorAudit` |
| **2. Red de Bodegas** | `/api/warehouses` | 3 | `WarehouseManagement`, `WarehouseRead` |
| **3. Inventarios y Stock** | `/api/inventories` | 4 | `InventoryManagement`, `InventoryRead`, `InventoryAdjust` |
| **4. Catálogo Comercial** | `/api/catalog` | 6 | `ProductManagement`, Consulta Pública / Vendedor |
| **5. Carrito y Pedidos** | `/api/orders` | 6 | `Checkout`, `OrderRead` (con aislamiento por propiedad) |
| **6. Logística y Despachos** | `/api/logistics` | 7 | `FulfillmentOperate`, `FulfillmentDeliver`, `FulfillmentCancelByQuiebre`, `FulfillmentRead` |
| **7. Devoluciones y Garantías** | `/api/returns` | 7 | `ReturnRequest`, `ReturnInspect`, `ReturnApprove`, `ReturnRefund`, `ReturnRead` |
| **8. Facturación Tributaria** | `/api/billing` | 4 | `BillingGenerate` (Exclusivo Administrador), `BillingRead` |
| **9. Disponibilidad del Sistema** | `/health` | 1 | Acceso Anónimo (Sonda técnica Docker / Balanceador) |
| **Total Global** | — | **45** | **100% mapeados y soportados en el cliente** |

---

## 3. Modelo de Seguridad y Ciclo de Vida del Token Bearer JWT (ADR-0009)

1. **Autenticación Centralizada:** Obtenido exclusivamente mediante `POST /api/auth/login`. El servidor valida credenciales mediante hash criptográfico PBKDF2-HMAC-SHA256 con salt dinámico y emite un token firmado con HMAC-SHA256 y vigencia de 60 minutos.
2. **Eliminación Definitiva de Cabeceras Forjables:** La cabecera histórica insegura `X-Buyer-Id` ha sido totalmente purgada de la solución; cualquier intento de inyección es ignorado por el servidor. La identidad se extrae exclusivamente del claim criptográfico `sub`.
3. **Reserva en Memoria RAM (*Volatile In-Memory Session*):** Conforme a las reglas de mitigación de vulnerabilidades XSS de ADR-0009, el token reside exclusivamente en memoria RAM en `MemorySessionAdapter.ts`. Queda prohibido el uso de `localStorage` o `sessionStorage`.
4. **Política de Cero Renovación (*No Refresh Token*):** El backend no dispone de endpoints de refresco. Al expirar la ventana de 60 minutos o al recibir una respuesta `401 Unauthorized`, la sesión se cierra de manera fail-closed y se redirecciona al usuario a la pantalla de ingreso.

---

## 4. Normalización de Paginación y Consultas

Todas las consultas que retornan colecciones masivas implementan paginación uniforme basada en cero mediante el DTO `PagedResult<T>`:

- `page`: Índice basado en 0 (valores menores a 0 se normalizan a 0).
- `size`: Tamaño de página (por defecto 20, **límite superior de 100**).
- `totalItems`: Conteo total ejecutado a nivel de base de datos antes de aplicar el desplazamiento (`Skip`/`Take`).
- El cliente consume prioritariamente las rutas paginadas (ej. `GET /api/catalog/products/paged`) para optimizar el rendimiento y evitar transferencias excesivas de carga útil.

---

## 5. Política Restrictiva de CORS

La API implementa una política CORS estricta en `Zentric.Api` gobernada por la configuración `Cors:AllowedOrigins`:
- Orígenes explícitamente permitidos (ej. `http://localhost:5173`) reciben la cabecera `Access-Control-Allow-Origin`.
- Solicitudes preflight `OPTIONS` son respondidas con `204 No Content` y `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`.
- **Prohibición de comodín (`*`):** Debido al envío de credenciales de autorización Bearer, la especificación W3C prohíbe el uso de `*`, requiriendo la declaración explícita de cada dominio cliente autorizado.

---

## 6. Aislamiento por Propiedad de Recurso (*Resource Ownership*, ADR-0013)

El sistema impone un doble anillo de defensa: una vez superada la política de rol, el servidor verifica la propiedad del recurso:

| Operación | Rol | Comportamiento Contractual |
|---|---|---|
| `GET /api/orders/{id}` | `Buyer` | Si el pedido pertenece al comprador, retorna `OrderDto` (200 OK). Si pertenece a otro, retorna **`404 Not Found`** para prevenir la enumeración de identificadores. |
| `GET /api/orders/{id}` | `Seller` | Retorna una representación recortada `SellerOrderViewDto` conteniendo únicamente sus líneas vendidas y su subtotal, sin exponer datos del comprador ni importes ajenos. |
| `POST /api/orders/cart` | `Buyer` | No admite cuerpo; la identidad del comprador se deriva forzosamente del token Bearer autenticado. |
| `POST /api/catalog/products` | `Seller` | El identificador de vendedor se extrae del token; no se permite su plantación en el payload JSON. |
| `GET /api/billing/invoices/order/{id}` | `Buyer` | Visualiza únicamente la Factura Maestra consolidada de su compra. |
| `GET /api/billing/invoices/order/{id}` | `Seller` | Visualiza únicamente la factura de detalle correspondiente a sus productos (`VendorDetail`). |

---

## 7. Matriz de Decisiones Arquitectónicas Integradas

| Referencia Canónica | Desafío Contractual Detectado | Solución Formalizada y Verificada |
|---|---|---|
| **ADR-0003** | Ambigüedad en productos físicos y catálogo heterogéneo. | Un producto de tipo `Physical` exige obligatoriamente al menos una variante con SKU. |
| **ADR-0006** | Contradicción sobre la potestad de aprobar devoluciones. | La aprobación o rechazo comercial es potestad **exclusiva del Vendedor dueño del producto** (`ReturnApprove`); el Administrador solo ejecuta el reembolso monetario (`ReturnRefund`). |
| **ADR-0009** | Ausencia de autenticación unificada y cabecera forjable. | Introducción de `POST /api/auth/login` con tokens JWT HS256, vigencia de 60 minutos, sesión en memoria RAM y eliminación de `X-Buyer-Id`. |
| **ADR-0012** | Tipado numérico incoherente en la serialización de enumeradores. | Los cuerpos JSON de solicitud y respuesta se restringen estrictamente a nombres canónicos en formato de texto (ej. `"Seller"`, `"Physical"`, `"Cart"`). |
| **ADR-0013** | Vulnerabilidad de acceso transversal a datos de otros usuarios. | Implementación de filtros forzados en EF Core por propiedad de recurso y respuesta `404 Not Found` ante recursos ajenos. |
| **ADR-0014** | Enmiendas a la matriz de roles y facultades operativas. | El Operador Logístico adquiere facultad de reportar quiebres (*stock fantasma*); la facturación split se traslada al Administrador; inclusión plena del Supervisor como perfil de consulta. |
| **ADR-0017** | Ausencia de endpoints para listado y consulta transversal. | Creación de `GET /api/orders` y `GET /api/logistics/fulfillments` (pluralizado) con filtrado y aislamiento por rol. |
| **ADR-0021** | Retorno inconsistente de identificadores en el alta de catálogo. | `POST /api/catalog/products` retorna `CreatedProductDto` conteniendo tanto el `productId` como los `variantIds` para su uso directo en inventario y pedidos. |

---

## 8. Veredicto Final de Alineación

- **Conformidad Estructural:** 100% de los 45 endpoints del backend están plenamente especificados y mapeados a los puertos de entrada del frontend.
- **Seguridad y Criptografía:** Cumplimiento total de ADR-0009 (tokens Bearer, expiración de 60 minutos, sesión volátil en memoria RAM, eliminación de cabeceras forjables).
- **Consistencia de Tipos:** Esquemas Zod y DTOs tipados en estricta sincronía con los contratos C# de la API REST.
- **Estado Global:** **VERIFICADO (READY FOR WAVE 1)**.
