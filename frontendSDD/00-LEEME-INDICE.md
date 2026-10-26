# Zentric — Paquete integral de SDD frontend y backend

## Propósito
Este paquete organiza la especificación de Zentric en cuatro perspectivas complementarias: **negocio**, **arquitectura**, **roles** y **experiencia**. Contiene el dominio base, especificaciones frontend y backend, contratos transversales, trazabilidad, criterios de aceptación y un prompt maestro para agentes concurrentes por olas.

## Orden de lectura obligatorio
1. `01-negocio/01-alcance-y-decisiones.md`
2. `zentric-domain-sdd.md` (documento de dominio base conservado)
3. `02-arquitectura/01-arquitectura-global.md`
4. `02-arquitectura/02-arquitectura-backend-csharp.md` y `02-arquitectura/03-arquitectura-frontend-nextjs.md`
5. `03-roles/01-matriz-de-autorizacion-y-alcance.md`
6. `04-experiencia/` y los SDD por rol en `frontend/`
7. `05-backend/` para servicios, API, persistencia, integración y pruebas
8. `zentric-matriz-trazabilidad-backend-frontend.md`
9. `PROMPT-MAESTRO-AGENTES-CONCURRENTES.md`

## Jerarquía de fuentes de verdad
- Las decisiones explícitas consolidadas en `01-negocio/01-alcance-y-decisiones.md` prevalecen sobre documentos anteriores cuando se marca una contradicción concreta.
- El dominio aprobado define entidades, invariantes, estados y reglas de negocio; no se puede cambiar desde una capa de UI o infraestructura.
- Los contratos API versionados/OpenAPI definen el contrato ejecutable frontend-backend una vez aprobados.
- Los SDD de experiencia definen comportamiento de interfaz, no reglas de negocio ni autorización efectiva.
- Los documentos heredados se conservan como contexto; cualquier contradicción detectada debe registrarse en la matriz de decisiones y resolverse antes de implementar el flujo afectado.

## Estado y cautelas
Este paquete es una **especificación de trabajo**, no evidencia de que exista una implementación funcional ni de que todos los requisitos estén aprobados. El agente coordinador debe inspeccionar el repositorio real, verificar los documentos contra el código y mantener un registro de incertidumbres. Las decisiones marcadas `ABIERTO` no se deben completar por intuición.

## Estructura
- `01-negocio/`: alcance, reglas consolidadas y decisiones abiertas.
- `02-arquitectura/`: límites, dependencias, frontend y backend.
- `03-roles/`: capacidades y alcance por rol.
- `04-experiencia/`: principios y journeys de usuario.
- `05-backend/`: casos de uso, API, persistencia, medios, integración y calidad.
- `frontend/`: SDD frontend por rol y transversal revisados.
- `PROMPT-MAESTRO-AGENTES-CONCURRENTES.md`: orquestación por olas con puertas de calidad y escalamiento de incertidumbres.
- Documentos `zentric-*` en raíz: fuentes heredadas conservadas.