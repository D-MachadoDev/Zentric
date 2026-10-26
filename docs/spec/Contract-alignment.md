# Contract Alignment — Zentric (Backend ↔ Frontend)

> **Fuente de verdad cross-stack:** este documento define cómo se mantienen alineados el backend (`Zentric.Api`) y el frontend (`apps/frontend`) con la especificación en `docs/spec/`. Adaptado del patrón de gobernanza SDD del repo de referencia.

## 1. Regla de autoridad

Cuando el código y la SDD (o el frontend y el backend) discrepan:

1. **Parar** la tarea afectada.
2. Marcarla como `REPAIR_CONTRACT` o `BLOCKED`.
3. Registrar la discrepancia y los archivos afectados.
4. Reparar el contrato o la implementación de forma deliberada.
5. Re-ejecutar la validación relevante.

No inventar endpoints, DTOs, roles, códigos de error, claims JWT ni comportamiento de base de datos.

## 2. Espejo de especificación (backend ↔ frontend)

- `docs/spec/backend/` es la fuente de verdad del backend.
- `docs/spec/frontend/` es la fuente de verdad del frontend (espejo de los contratos backend + especificación propia).
- Los archivos espejo (p. ej. `docs/spec/frontend/05-backend/03-persistencia-y-migraciones.md`) deben ser **idénticos** byte a byte a su contraparte backend.
- `scripts/spec-sync-check.ps1` valida sincronización (ADRs, endpoints, DTOs, modelos frontend). Exit 0 = OK, 1 = drift.

## 3. Contratos compartidos

- API REST: `docs/spec/backend/04-api-contratos/01-api-rest-y-contratos.md`.
- Persistencia (tablas, índices, FKs): `docs/spec/backend/05-persistencia/01-persistencia-y-migraciones.md` ↔ `docs/spec/frontend/05-backend/03-persistencia-y-migraciones.md`.
- Seguridad/observabilidad: `docs/spec/backend/02-arquitectura/03-seguridad-observabilidad.md`.
- Despliegue/ops: `docs/spec/backend/08-despliegue-ops/`.

## 4. Flujo de cambio

1. Inspeccionar el estado actual y preservar cambios del usuario.
2. Identificar la capa mínima afectada (dominio → aplicación → infraestructura → API → frontend).
3. Editar solo el alcance de la app o de la SDD correspondiente.
4. Validar primero con el comando más estrecho que pueda refutar el cambio.
5. Ejecutar build, tests e integración afectados.
6. Actualizar el estado en la nota del proyecto (Obsidian) y, si aplica, `docs/spec/`.
7. Registrar comandos, exit codes, conteos de tests y bloqueadores.

## 5. Gate de completitud

El repositorio no se reporta como completo hasta que:

- `docker compose config --quiet` pasa.
- Build completo de Compose pasa.
- `frontend`, `api`, PostgreSQL (`db`) y servicios auxiliares están healthy.
- Backend build y tests pasan.
- Frontend build, lint y tests pasan.
- Smoke tests JWT/CORS pasan.
- No quedan `REPAIR_BACKEND`, `BLOCKED`, `untested` ni endpoints no documentados.
- Los archivos espejo frontend/backend están sincronizados (`spec-sync-check.ps1` exit 0).

Estados finales válidos: `COMPLETE` · `IN_PROGRESS` · `BLOCKED`.
