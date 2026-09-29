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


---

## Reglas obligatorias al construir el frontend

Estas reglas son **no negociables**: la primera mitad viene de la Ley (`ZENTRIC.md`) y
la segunda de lo que el backend ya expone y verifica. El detalle y la evidencia estan
en [`Contract-alignment.md`](Contract-alignment.md).

### Del contrato con la API

1. **Enviar `X-Buyer-Id` en todas las llamadas.** El backend no emite JWT. Sin la cabecera,
   los endpoints que exigen identidad responden `401`.
2. **Usar paginación en todo listado.** `page` base cero, `size` por defecto `20` y maximo `100`.
   Consumir `items`, `totalItems`, `totalPages`, `hasNext` para construir los controles.
3. **No diferenciar "no existe" de "no es tuyo".** Ambos devuelven `404` a proposito, para no
   permitir enumerar pedidos ajenos. La UI debe mostrar "no encontrado".
4. **Centralizar el envio de `X-Buyer-Id` y la base URL en un unico interceptor HTTP.** Asi la
   migracion futura a JWT es un solo punto de cambio.
5. **Errores con Problem Details (RFC 9457).** El backend responde con `ProblemDetails`;
   leer `detail` para el mensaje y `status` para el caso. No inventar codigos propios.

## 0. Control de Versiones

| Versión | Fecha | Cambio | Autor |
| --- | --- | --- | --- |
| 1.0.0 | 2026-09-27 | Especificación inicial del frontend. Configuración base creada; implementación diferida. | Agente IA |
| 1.1.0 | 2026-09-27 | Sincronizado con el backend real (29 endpoints): CORS resuelto, `X-Buyer-Id` obligatorio, paginación con `size` acotado a 100, reglas de la Ley aplicadas a la UI, R-08 (reportes) registrado. | Agente IA |

---

## 1. Rol, objetivo y alcance

- **Rol:** Agente Orquestador del frontend de Zentric.
- **Objetivo:** definir y luego construir la consola web que consume la API
  existente, sin introducir reglas de negocio en el cliente.
- **Alcance:** capa de presentación. El backend es la autoridad sobre el dominio.
- **Límite duro:** el frontend **no** implementa reglas de negocio. Si una regla
  parece necesitar lógica en el cliente, es deuda del backend y se registra
  como `REPAIR_BACKEND`.

### De la Ley (`ZENTRIC.md`) que restringen la interfaz

6. **Un comprador nunca ve datos de otro comprador** (Dominio 2). Ni por URL, ni por error,
   ni por cache del navegador.
7. **No ofrecer devolucion de productos digitales** (Dominio 10: "esta prohibido devolver
   productos digitales"). El boton no debe renderizarse para `ProductType == Digital`.
8. **La devolucion fisica reingresa como "Usado"** (Dominio 10). No presentarla como
   devolucion de stock nuevo.
9. **`Supervisor` es un perfil de consulta** (Dominio 1). Sin acciones de escritura en su UI.
10. **No inventar reglas de negocio.** Si la UI necesita una regla que no esta en la Ley
       ni en `backendSDD/`, se pregunta al Owner (freno de mano, `AGENTS.md` 0.3).

> **La Ley no define diseno de interfaz.** `ZENTRIC.md` es funcional: no prescribe
> pantallas, componentes ni estilos. Esas decisiones son del Owner y deben quedar
> documentadas aqui como decisiones, nunca como si vinieran de la Ley.

---

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
| CORS | **Configurado y verificado** (politica `Frontend`) | `[CONFIRMADO]` |
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
| `Authorization: Bearer <JWT>` en toda petición | **Ahora sí**: existe proveedor de identidad propio desde `ADR-0009` (JWT HS256 de 60 min). Se aplica por política de reserva |
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
| `adapters/session` | `NOT_STARTED` | Crear: guarda el token de `POST /api/auth/login` y lo adjunta en cada petición |
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
| FR-02 | ~~CORS no configurado~~ **RESUELTO** | Origenes declarados; sin comodin | Ya no aplica | `CERRADO` |
| FR-03 | La creación de producto no devuelve `variantId` | El cliente debe leer `variants[0].id` | Mapeo explícito en `Frontend-Adapters.md` | `CONOCIDO` |
| FR-04 | No hay endpoint de listado de pedidos | El panel no puede listar pedidos | Verificar contra la API en ejecución | `ABIERTO` |
| FR-05 | Enums serializados como números | Acoplamiento al orden de valores | Constantes explícitas, nunca índices literales | `CONTROLADO` |
| FR-06 | Licencia comercial de MediatR | Sólo afecta al backend en producción | Fuera del alcance del frontend | `NOTIFICADO` |

---

## 7. Bloqueos que requieren decisión del Owner

1. **Autenticación (FR-01):** ¿se implementa JWT en el backend antes que la
   pantalla de login, o el frontend sigue con sesión provisional?
2. **CORS (FR-02): RESUELTO.** Si el frontend se despliega en otro dominio, hay que declararlo en el backend (no hay comodin). Originalmente el frontend no funcionaba desde el
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
([`../AGENTS.md`](../AGENTS.md#04-lenguaje-ubicuo-estricto-cero-sinónimos) y la regla de Cero Asunciones.
