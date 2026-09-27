# Contract-alignment

> Auditoría de contrato entre el cliente (`frontend/`) y la API (`backend/`).
>
> **Nota de trazabilidad:** el prompt de orquestación solicita los archivos
> `backendSDD/Contract-alignment.md`, `backendSDD/Adapters/Api-rest-endpoints.md`,
> `backendSDD/Adapters/Rest-validation.md`,
> `backendSDD/Adapters/Global-exception-handler.md` y
> `backendSDD/Backend-Cors-Security.md`. **Ninguno existe en este repositorio.**
> El equivalente veraz está en
> [`../backendSDD/Presentation/01-endpoints.md`](../backendSDD/Presentation/01-endpoints.md)
> y [`../backendSDD/Infrastructure/01-data-access.md`](../backendSDD/Infrastructure/01-data-access.md).
> Este documento **no** los sustituye ni inventa su contenido.

---

## 1. Verificación de entorno

| Parámetro | Valor del prompt | Valor real | Veredicto |
| --- | --- | --- | --- |
| Raíz del frontend | `frontend/` | `frontend/` | ✅ |
| Variable de entorno | `VITE_API_BASE_URL` | `VITE_API_BASE_URL` | ✅ |
| Puerto por defecto | `http://localhost:8080` | `http://localhost:5076` | ❌ **Discrepancia** |
| Puerto interno | — | `8080` dentro del contenedor | ℹ️ Aclaración |
| Base de datos | PostgreSQL 16 | `postgres:16.15-alpine` | ✅ |

El `8080` es el puerto **interno** del contenedor. Desde el host, Compose publica
el `5076`. El `.env.example` del frontend usa `5076`, correcto para desarrollo.

---

## 2. Cobertura de endpoints

| Categoría | Total | Mapeados | Verificados en ejecución |
| --- | --- | --- | --- |
| Salud | 1 | 1 | 1 |
| Usuarios | 3 | 3 | 3 |
| Bodegas | 3 | 3 | 2 |
| Catálogo | 4 | 4 | 4 |
| Inventario | 2 | 2 | 1 |
| Pedidos | 5 | 5 | 5 |
| Facturación | 2 | 2 | 1 |
| Logística | 4 | 4 | 0 |
| Devoluciones | 3 | 3 | 0 |
| **Total** | **27** | **27** | **16** |

`16/27` verificados con comportamiento HTTP real; `27/27` mapeados en la
especificación. Los 11 restantes quedan pendientes de revalidación en F2.

---

## 3. Verificación de autenticación

| Requisito del prompt | Estado | Evidencia |
| --- | --- | --- |
| `Authorization: Bearer <token>` | ❌ Imposible | El backend no emite JWT |
| Emisión de token en el login | ❌ No existe | No hay endpoint de autenticación |
| `401` limpia sesión y redirige | ⚠️ Especificado | Requiere que el backend emita `401` |
| `403` conserva sesión | ⚠️ Especificado | Requiere autorización por endpoint |

**Conclusión:** el requisito de JWT del prompt **no puede satisfacerse** con el
backend actual. No se implementa un token falso: se registra el bloqueo.


---

## 4. Verificación de CORS

`[OBSERVADO]` `Program.cs` **no registra ninguna política CORS**. Consecuencia
directa: una petición desde `http://localhost:5173` a `http://localhost:5076/api/*`
será bloqueada por el navegador antes de llegar al servidor.

**Solicitud al backend** (`REPAIR_BACKEND`):

```csharp
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins("http://localhost:5173")
    .AllowAnyHeader()
    .AllowAnyMethod()));
// ...
app.UseCors();
```

Alternativa válida sin tocar el backend: un proxy en Vite que reenvíe `/api` al
`5076`, lo que evita CORS por completo en desarrollo. Se documenta como
`OPCIÓN-B` en `Frontend-Architecture.md` §7.

---

## 5. Verificación de roles

| Rol del prompt | Existe en Zentric | Módulo asignado |
| --- | --- | --- |
| `natural-customer` | ❌ | — |
| `business-customer` | ❌ | — |
| `business-operator` | ❌ | — |
| `business-supervisor` | ❌ | — |
| `teller` | ❌ | — |
| `commercial` | ❌ | — |
| `internal-analyst` | ❌ | — |
| — | ✔ Administrador | `modules/admin` |
| — | ✔ Vendedor | `modules/seller` |
| — | ✔ Comprador | `modules/buyer` |
| — | ✔ Operador logístico | `modules/logistics` |

**0 de 7** roles del prompt existen. Los **4** módulos se definen según la Ley.

---

## 6. Verificación de reglas de negocio del prompt

| Regla del prompt | Existencia | Tratamiento |
| --- | --- | --- |
| Préstamos y créditos | ❌ No existe | No se implementa |
| Transferencias entre cuentas | ❌ No existe | No se implementa |
| Aprobación de créditos | ❌ No existe | No se implementa |
| Apertura y cierre de cuentas bancarias | ❌ No existe | No se implementa |
| Depósitos y retiros en efectivo | ❌ No existe | No se implementa |
| Registro de empleados | ⚠️ Parcial | El alta de `Usuario` cubre el caso |
| **Carrito de compras** | ✅ Existe | `modules/buyer` |
| **Inventario y bodegas** | ✅ Existe | `modules/seller`, `modules/admin` |
| **Pedidos y pagos** | ✅ Existe | `modules/buyer` |
| **Facturación** | ✅ Existe | `modules/buyer` |
| **Logística y despachos** | ✅ Existe | `modules/logistics` |
| **Devoluciones** | ✅ Existe | `modules/shared-modules` |

Se conserva la **estructura metodológica** del prompt y se descarta su dominio.

---

## 7. Acciones requeridas del backend

| Prioridad | ID | Acción | Bloquea |
| --- | --- | --- | --- |
| 🔴 Crítica | R-02 | Habilitar CORS o proxy en Vite | Toda la UI en navegador |
| 🔴 Crítica | R-01 | Implementar autenticación y JWT | Login y guardas reales |
| 🟡 Media | R-03 | Corregir `GET /api/Logistics/fulfillment` (405) | Panel de despachos |
| 🟡 Media | R-04 | Añadir `GET /api/Orders` | Listado de pedidos |
| 🟢 Baja | R-05 | Migrar `ProblemDetails` a RFC 9457 | Consistencia de errores |
| 🟢 Baja | R-06 | Devolver `variantId` en el alta de producto | Flujo del vendedor |
| 🟢 Baja | R-07 | Completar el split de facturas por vendedor | Cierre financiero |

---

## 8. Veredicto

| Criterio | Estado |
| --- | --- |
| Estructura del frontend | ✅ Conforme |
| Contrato de endpoints | ⚠️ 27/27 mapeados, 16/27 verificados |
| JWT | ❌ Imposible con el backend actual |
| CORS | ❌ No configurado |
| Roles del prompt | ❌ No existen en esta Ley |
| Dominio implementado | ✅ El de Zentric |

**Estado global: `IN_PROGRESS`.** No puede declararse `COMPLETE` mientras R-01 y
R-02 sigan abiertos, porque ninguna pantalla puede hablar con la API desde el
navegador.
