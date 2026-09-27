# Frontend-SDD — Orquestador

> **Fuente única de verdad (SSoT) del frontend de Zentric.**
> El backend se especifica en [`../backendSDD/`](../backendSDD/) y su lógica de
> negocio no se modifica desde aquí. La Biblia funcional es
> [`../ZENTRIC.md`](../ZENTRIC.md) (Ley, intocable).
>
> Jerarquía de verdad: decisión del Owner → [`../AGENTS.md`](../AGENTS.md) →
> [`../ZENTRIC.md`](../ZENTRIC.md) (Ley) → este `frontendSDD/` →
> [`../backendSDD/`](../backendSDD/) para el contrato del servidor.

---

## 0. Control de Versiones

| Versión | Fecha | Cambio | Autor |
| --- | --- | --- | --- |
| 1.0.0 | 2026-09-27 | Especificación inicial del frontend. Configuración base creada; implementación diferida. | Agente IA |

---

## 1. Rol, objetivo y alcance

- **Rol:** Agente Orquestador del frontend de Zentric.
- **Objetivo:** definir y luego construir la consola web que consume la API
  existente, sin introducir reglas de negocio en el cliente.
- **Alcance:** capa de presentación. El backend es la autoridad sobre el dominio.
- **Límite duro:** el frontend **no** implementa reglas de negocio. Si una regla
  parece necesitar lógica en el cliente, es deuda del backend y se registra
  como `REPAIR_BACKEND`.

### 1.1 Documentos que componen este SDD

| Documento | Contenido |
| --- | --- |
| `Frontend-SDD.md` | Este orquestador: estado, fases, gates, riesgos. |
| `Frontend-Architecture.md` | Capas, dependencias, estructura de carpetas, límites. |
| `Frontend-Domain-Services.md` | Servicios de aplicación del cliente y sus puertos. |
| `Frontend-Adapters.md` | Mapeo endpoint por endpoint contra la API real. |
| `Frontend-Role-Modules.md` | Módulos por rol y guardas de acceso. |
| `Frontend-Design-System.md` | Tokens, componentes, accesibilidad, responsive. |
| `Frontend-User-Flows.md` | Recorridos observables de usuario. |
| `Contract-alignment.md` | Auditoría de contrato frontend ↔ backend. |

---

## 2. Estado de partida

| Dato | Valor | Etiqueta |
| --- | --- | --- |
| Stack decidido | React 18 + TypeScript 5 + Vite 5 | `[CONFIRMADO]` |
| Backend | .NET 10, puerto host `5076`, contenedor `8080` | `[OBSERVADO]` |
| Endpoints publicados | 26 en OpenAPI + `/health` | `[OBSERVADO]` |
| Autenticación | **No implementada** en el backend | `[OBSERVADO]` |
| CORS | No configurado en el backend | `[OBSERVADO]` |
| Código de frontend | Configuración base únicamente | `[OBSERVADO]` |
| SDKs | Node 24.14, npm 10.8.2, Docker 29.7.2 | `[OBSERVADO]` |

---

## 3. Contradicción crítica con el prompt de orquestación recibido

`[OBSERVADO]` Se recibió un prompt de orquestación de frontend que **no corresponde a
este producto**. Evidencia:

| Elemento del prompt | Realidad verificada en Zentric |
| --- | --- |
| Módulos `natural-customer`, `business-customer`, `teller`, `commercial`, `internal-analyst` | Roles reales: Vendedor, Comprador, Administrador, Operador logístico |
| Préstamos, créditos, transferencias, aprobaciones de crédito | No existen en [`../ZENTRIC.md`](../ZENTRIC.md) |
| `Authorization: Bearer <JWT>` en toda petición | El backend **no tiene JWT** ni proveedor de identidad |
| Backend por defecto en `http://localhost:8080` | Puerto host real `5076`; el `8080` es interno del contenedor |
| `backendSDD/Contract-alignment.md`, `backendSDD/Adapters/*`, `backendSDD/Backend-Cors-Security.md` | **No existen.** El equivalente vive en [`../backendSDD/Presentation/01-endpoints.md`](../backendSDD/Presentation/01-endpoints.md) |
| SweetAlert2 obligatorio | No está en la Ley; se adopta sólo como decisión de diseño |

**Decisión:** se conserva la **estructura metodológica** del prompt (capas, adaptadores,
servicios, guardas por rol, estados obligatorios, pruebas, Docker) porque es válida y
aplicable, pero se **sustituye todo el dominio** por el de Zentric. Implementar roles

---

## 4. Fases y estado

| Fase | Entregable | Estado | Evidencia |
| --- | --- | --- | --- |
| F0 | Especificación del frontend (8 documentos) | ✅ `VERIFIED` | Este `frontendSDD/` |
| F1 | Base del proyecto Vite + React + TS | ✅ `VERIFIED` | `frontend/package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.env.example` |
| F2 | Implementación de capas y módulos | ⬜ `NOT_STARTED` | — |
| F3 | Adaptador HTTP + sesión | ⬜ `NOT_STARTED` | — |
| F4 | Módulos por rol | ⬜ `NOT_STARTED` | — |
| F5 | Estados de UX, accesibilidad, responsive | ⬜ `NOT_STARTED` | — |
| F6 | Pruebas (unitarias + integración) | ⬜ `NOT_STARTED` | — |
| F7 | Dockerfile y entrega | ⬜ `NOT_STARTED` | — |

### 4.1 Estado por entregable

| Entregable | Estado | Siguiente acción |
| --- | --- | --- |
| Configuración base del proyecto | `IMPLEMENTED` | Instalar dependencias |
| `domain/` (modelos y puertos) | `NOT_STARTED` | Crear según `Frontend-Architecture.md` |
| `application/` (servicios) | `NOT_STARTED` | Crear según `Frontend-Domain-Services.md` |
| `adapters/http` | `NOT_STARTED` | Crear según `Frontend-Adapters.md` |
| `adapters/session` | `NOT_STARTED` | Crear; marcado `PROVISIONAL` |
| `adapters/alert` | `NOT_STARTED` | Crear |
| `components/` | `NOT_STARTED` | Crear según `Frontend-Design-System.md` |
| Módulos por rol | `NOT_STARTED` | Crear según `Frontend-Role-Modules.md` |
| Pruebas | `NOT_STARTED` | Crear en F6 |
| `frontend/Dockerfile` | `NOT_STARTED` | Crear en F7 |
| `frontend/README.md` | `NOT_STARTED` | Crear en F7 |

---

## 5. Reglas inviolables

1. **El cliente no decide el dominio.** Toda transición de estado se pide al
   servidor. La UI no replica invariantes más allá de *feedback* inmediato.
2. **Los términos son los de la Ley.** Producto, Variante, Bodega, Pedido,
   Despacho, Factura, Devolución, Vendedor, Comprador, Administrador,
   Operador logístico. No se inventan sinónimos ni se traducen los roles.
3. **Un solo adaptador habla con la red.** Ningún componente construye una URL ni
   una cabecera `Authorization`.
4. **Todo estado es visible.** Cada vista declara carga, vacío, error y éxito.
5. **Ningún error se traga.** El mensaje del servidor se muestra al usuario.
6. **Sin secretos en el cliente.** No hay llaves ni secretos; las credenciales
   eventuales viven sólo en memoria o `sessionStorage`.

---

## 6. Riesgos abiertos

| ID | Riesgo | Impacto | Mitigación | Estado |
| --- | --- | --- | --- | --- |
| FR-01 | Sin autenticación en el backend | No se puede aplicar RG-01 en la UI | Sesión local marcada `PROVISIONAL` | `ABIERTO` |
| FR-02 | CORS no configurado | El navegador bloqueará `/api/*` desde `localhost:5173` | Registrar `REPAIR_BACKEND` | `ABIERTO` |
| FR-03 | La creación de producto no devuelve `variantId` | El cliente debe leer `variants[0].id` | Mapeo explícito en `Frontend-Adapters.md` | `CONOCIDO` |
| FR-04 | No hay endpoint de listado de pedidos | El panel no puede listar pedidos | Verificar contra la API en ejecución | `ABIERTO` |
| FR-05 | Enums serializados como números | Acoplamiento al orden de valores | Constantes explícitas, nunca índices literales | `CONTROLADO` |
| FR-06 | Licencia comercial de MediatR | Sólo afecta al backend en producción | Fuera del alcance del frontend | `NOTIFICADO` |

---

## 7. Bloqueos que requieren decisión del Owner

1. **Autenticación (FR-01):** ¿se implementa JWT en el backend antes que la
   pantalla de login, o el frontend sigue con sesión provisional?
2. **CORS (FR-02):** sin decisión del backend, el frontend no funciona desde el
   navegador.
3. **Matriz de permisos por rol:** con 4 roles y 26 endpoints falta decidir qué
   módulo ve cada actor.
4. **Listados de sólo lectura:** el backend expone consulta de pedido por id pero
   no de colección. ¿Debe añadirse?

---

## 8. Registro de acciones

| Fecha | Acción | Resultado |
| --- | --- | --- |
| 2026-09-27 | Se eliminó el código de React previamente generado | `frontend/` conserva sólo configuración base |
| 2026-09-27 | Se migraron 151 referencias de `SDD/` a `backendSDD/` | 27 archivos actualizados, 0 referencias rotas |
| 2026-09-27 | Se detectó contradicción entre el prompt de orquestación recibido y el dominio de Zentric | Registrada en la sección 3; no se implementó dominio bancario |

---

## 9. Comandos de referencia

```powershell
# Backend
cd backend; dotnet build Zentric.slnx
cd backend; dotnet test  Zentric.slnx

# Frontend (desde la raiz)
cd frontend; npm install
cd frontend; npm run build
cd frontend; npm test
```

---

## 10. Criterio de terminado (DoD)

- [ ] `frontend/` contiene todo el código de cliente y su `README.md`.
- [ ] Cada endpoint del backend tiene mapeo en el cliente o exclusión explícita.
- [ ] Cada rol tiene módulo protegido y comportamiento de panel definido.
- [ ] Estados de carga, vacío, error y éxito presentes en todas las vistas.
- [ ] Accesibilidad verificada: foco, teclado, contraste, movimiento reducido.
- [ ] Pruebas de adaptadores, servicios y guardas en verde.
- [ ] `npm run build` sin errores de TypeScript.
- [ ] `frontend/Dockerfile` construye y sirve la aplicación.
- [ ] Sin reglas de negocio implementadas en el cliente.
- [ ] Sin dominio ajeno (bancario) incorporado.

bancarios o inventar autenticación violaría el Lenguaje Ubicuo
([`../AGENTS.md`](../AGENTS.md) §0.4) y la regla de Cero Asunciones.
