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

## 3. Identidad del llamante — Bearer token (OBLIGATORIO)

`[CONFIRMADO]` **Cambiado el 2026-09-28 por `ADR-0009`.** El backend **sí emite JWT** ahora, y
la cabecera `X-Buyer-Id` **fue eliminada**: escribirla ya no autentica a nadie.

| Situación | Respuesta observada |
| --- | --- |
| Token válido + dueño del pedido | `200 OK` |
| Token válido + comprador distinto al dueño | `404 Not Found` |
| Sin token, o token caducado o forjado | `401 Unauthorized` |
| Solo la cabecera antigua `X-Buyer-Id` | `401 Unauthorized` (ya no sirve) |

> El mismo mensaje para "no existe" y "no es tuyo" es deliberado: distinguirlos
> permitiría enumerar pedidos ajenos probando GUIDs. **El frontend no debe
> diferenciar esos casos en la interfaz.**

**Regla:** enviar `Authorization: Bearer {token}` en **todas** las llamadas, salvo `POST /api/auth/login`
y `GET /health`. Centralizarlo en el interceptor HTTP.

### Ciclo de vida de la sesión

1. `POST /api/auth/login` con `{ "email": ..., "password": ... }` → `200` con
   `{ token, expiresAt, userId, email, fullName, role }`.
2. Guardar el token y adjuntarlo como `Bearer` en cada petición.
3. Al recibir `401`, cerrar sesión y volver al login. **No hay token de refresco**:
   la vida es de 60 minutos y entonces toca autenticarse de nuevo.
4. `GET /api/auth/me` devuelve la identidad del token vigente sin consultar la base;
   sirve para restaurar la sesión al abrir la aplicación.

### Auto-registro

`POST /api/users` es el **único** endpoint de negocio sin token, y solo si el `role` es `Buyer`:
la Ley incluye "Registro de compradores" en el alcance. Cualquier otro rol responde `403`
salvo que quien llame sea un `Administrator` autenticado (ZENTRIC.md, Dominio 3).

**El frontend debe montar la pantalla de acceso sobre este flujo**, ya que R-01
("el backend no emite JWT") quedó cerrado.

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
| Identidad del llamante | Cerrada: `POST /api/auth/login` emite JWT HS256 y `Authorization: Bearer` es obligatorio. `X-Buyer-Id` eliminada |
| CORS | Resuelto y verificado |
| Paginacion | Resuelta y verificada |
| Reglas de la Ley en la UI | **Por definir**: las restricciones estan en 7, falta decidir como se aplican |
| Roles | 5 roles de la Ley; los 7 del prompt no aplican |

**Estado global: `READY_TO_START`.** Los dos bloqueios que impedian hablar con la API desde el navegador estan resueltos y verificados: CORS (origen permitido recibe los headers) y autenticacion (`POST /api/auth/login` + `Authorization: Bearer`). La UI empieza con login, interceptor del token y paginacion.

**Cerrado desde el alineamiento original:** autorizacion por rol (Q-21 del backend → `ADR-0011`, 2026-09-29: 18 politicas, `FallbackPolicy` fail-closed, verificado con tokens de los cinco roles) y contrato de los `enum` en el cuerpo JSON (Q-22 → `ADR-0012`, 2026-09-29: **viajan por nombre**, el cliente manda `"Seller"` y nunca `1`; ver `Frontend-Adapters.md` §3.2, que tenia los valores numericos mal).

**Pendiente antes de produccion:** propiedad del recurso en las lecturas (Q-21b del backend: hoy un Comprador con el GUID correcto puede leer facturas o pedidos ajenos, y sin ese dictamen el frontend no puede exponer listados sin riesgo de exponer datos de otros) y reportes administrativos (R-08).
