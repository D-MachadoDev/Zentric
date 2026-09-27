# Contract-alignment

> Auditoría de contrato entre el cliente (`frontend/`) y la API (`backend/`).
>
> **Verificado por ejecución contra PostgreSQL real el 2026-09-27**, no solo por
> lectura de código. Tablero: `main` @ `9ddaa92`.
>
> El documento equivalente del backend es
> [`../backendSDD/Presentation/01-endpoints.md`](../backendSDD/Presentation/01-endpoints.md).

---

## 1. Entorno

| Parámetro | Valor real |
| --- | --- |
| Raíz del frontend | `frontend/` |
| Variable de entorno | `VITE_API_BASE_URL` |
| Puerto publicado desde el host | `http://localhost:5076` |
| Puerto interno del contenedor | `8080` |
| Puerto de desarrollo del front | `http://localhost:5173` (declarado en `Cors:AllowedOrigins`) |
| Base de datos | `postgres:16.15-alpine` |

---

## 2. Cobertura de endpoints

Recuento verificado sobre los controladores reales.

| Categoría | Total |
| --- | --- |
| Salud (`/health`) | 1 |
| Usuarios | 3 |
| Bodegas | 3 |
| Catálogo | 5 |
| Inventario | 2 |
| Pedidos | 5 |
| Facturación | 2 |
| Logística | 4 |
| Devoluciones | 4 |
| **Total** | **29** |

> **Corrección 2026-09-27:** la versión anterior declaraba 27 endpoints
> (Catálogo 4, Devoluciones 3). Los 2 nuevos son `GET /api/Catalog/products/paged`
> y la factura por vendedor del flujo de facturación. El total real es **29**.

### Flujos verificados de punta a punta contra la base real

| Flujo | Resultado observado |
| --- | --- |
| Facturación por vendedor | Maestra 400.000 · Plataforma 20.000 (5 %) · Vendedores 95.000 y 285.000 (95 % c/u). Suma sin doble conteo |
| Pago con comprobante | `PaymentReceipt` persistido: `Approved`, 240.000 COP, transacción `SIM-…`; pedido en `Paid` |
| Paginación | 13 productos → `totalPages=5` con `size=3`; un `size=500` se recorta a **100** |
| Aislamiento de comprador | Dueño `200` · intruso `404` · sin identidad `401` |
| CORS | Origen permitido recibe el header; ajeno **no**; preflight `204` |

---

## 3. Identidad del llamante — `X-Buyer-Id` (OBLIGATORIO)

`[CONFIRMADO]` **El backend NO emite JWT.** La identidad viaja en la cabecera
**`X-Buyer-Id`**, resuelta por `HeaderBuyerAccessor`.

| Situación | Respuesta observada |
| --- | --- |
| Dueño del pedido + `X-Buyer-Id` válido | `200 OK` |
| Comprador distinto al dueño | `404 Not Found` |
| Sin cabecera y sin identidad | `401 Unauthorized` |

> El mismo mensaje para "no existe" y "no es tuyo" es deliberado: distinguirlos
> permitiría enumerar pedidos ajenos probando GUIDs. **El frontend no debe
> diferenciar esos casos en la interfaz.**

**Regla:** enviar `X-Buyer-Id` en **todas** las llamadas, no solo en pedidos.
Conviene centralizarlo en el interceptor HTTP, para que la migración a JWT sea de
un solo punto.

---

## 4. Paginación (OBLIGATORIA en listados)

| Parámetro | Regla |
| --- | --- |
| `page` | Base cero. Negativo se recorta a `0`. Por defecto `0` |
| `size` | Por defecto `20`, **máximo `100`**. `<= 0` cae al defecto; mayor que `100` se recorta |

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

- `totalItems` se cuenta en la base **antes** de aplicar `Skip`/`Take`.
- Referencia: `GET /api/Catalog/products/paged?vendorId=&page=0&size=20`.
- El listado simple **se conserva por compatibilidad**, pero el frontend **debe
  usar el paginado**.

> El recorte a 100 significa que el cliente nunca recibe error por pedir demasiado:
  recibe como máximo 100 elementos y el total real en `totalItems`.

---

## 5. CORS

`[CONFIRMADO]` **CORS SÍ está configurado y verificado.** Política `Frontend` con
los orígenes de `Cors:AllowedOrigins` (`appsettings.json`, sobreescribible con
`Cors__AllowedOrigins`; varios orígenes separados por comas).

| Petición | Resultado observado |
| --- | --- |
| `Origin: http://localhost:5173` | `200` + `Access-Control-Allow-Origin` |
| Origen no declarado | `200` pero **sin** header CORS → el navegador bloquea |
| Preflight `OPTIONS` | `204` + `Access-Control-Allow-Methods` |

> **No hay comodín `*`:** el backend prevé JWT y el protocolo prohíbe combinarlo
> con credenciales. Si el frontend se despliega en otro dominio, hay que
> **declararlo en el backend**; no basta con pedirlo desde el cliente.

> **Corrección 2026-09-27:** la versión anterior afirmaba que CORS no estaba
> configurado y pedía habilitarlo (acción R-02). Resuelto.
---

## 6. Roles
**0 de 7** roles del prompt existen. Los **5** del proyecto se definen segun la Ley (`ZENTRIC.md` Dominio 1):

| Rol de la Ley | Modulo |
|---|---|
| `Buyer` (Comprador) | `modules/buyer` |
| `Seller` (Vendedor) | `modules/seller` |
| `LogisticsOperator` (Operador logistico) | `modules/logistics` |
| `Admin` (Administrador) | `modules/admin` |
| `Supervisor` (Perfil de consulta) | `modules/admin`, solo lectura |

> `Supervisor` es un perfil de **consulta y seguimiento operativo** (`ZENTRIC.md` linea 87): no debe ejecutar acciones de escritura en la interfaz.

---

## 7. Reglas de la Ley que el cliente DEBE cumplir

Estas restricciones vienen de la Ley. El frontend debe cumplirlas **en la interfaz**, no confiar solo en que el backend las valide.

| Ley | Regla | Impacto en la UI |
|---|---|---|
| Dominio 2 | *"El comprador nunca administrara informacion de otros compradores"* | Nunca mostrar datos de otro usuario; tratar el `404` de pedido ajeno como "no encontrado" |
| Dominio 10 | *"Esta prohibido devolver productos digitales"* | **No** ofrecer boton de devolucion en productos digitales |
| Dominio 10 | El producto vuelve al stock con etiqueta "Usado" | La devolucion fisica no es una reposicion de stock nuevo |
| Dominio 1 | `Supervisor` es de consulta | Sin acciones de escritura para ese rol |
| OBJ 12 | *"Consultar reportes administrativos"* | Ver R-08: no existe en ninguna capa |

---

## 8. Acciones requeridas del backend

| ID | Accion | Estado |
|---|---|---|
| R-01 | Autenticacion JWT | BLOCKED por el Owner: falta algoritmo de hash (no existe `VerifyPassword`) y politica de tokens |
| R-02 | Habilitar CORS | Resuelto y verificado |
| R-03 | Corregir `GET /api/Logistics/fulfillment` (405) | Pendiente |
| R-04 | Anadir `GET /api/Orders` (listado) | Pendiente: hoy solo existe `GET /api/Orders/{id}` |
| R-05 | Migrar `ProblemDetails` a RFC 9457 | Resuelto en documentacion |
| R-06 | Devolver `variantId` en el alta de producto | Pendiente |
| R-07 | Split de facturas por vendedor | Resuelto y verificado |
| R-08 | **Reportes administrativos (OBJ 12)** | Pendiente: la Ley lo pide, no existe |

> **R-08 es nuevo.** El objetivo 12 exige "consultar reportes administrativos" y el proceso esta marcado como incluido. No hay endpoint ni modulo. Debe definirse antes de prometer esa pantalla.

---

## 9. Veredicto

| Criterio | Estado |
|---|---|
| Estructura del frontend | Conforme (aun sin `src/`) |
| Contrato de endpoints | 29/29 mapeados al estado real |
| Identidad del llamante | Parcial: `X-Buyer-Id` funciona; JWT bloqueado |
| CORS | Resuelto y verificado |
| Paginacion | Resuelta y verificada |
| Reglas de la Ley en la UI | **Por definir**: las restricciones estan en 7, falta decidir como se aplican |
| Roles | 5 roles de la Ley; los 7 del prompt no aplican |

**Estado global: `READY_TO_START`.** El bloqueo que impedia hablar con la API desde el navegador (CORS) esta resuelto. La UI puede empezar con `X-Buyer-Id` y paginacion.

**Pendiente antes de produccion:** JWT (R-01) y reportes administrativos (R-08).
