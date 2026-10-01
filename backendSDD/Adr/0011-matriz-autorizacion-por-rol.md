# [ADR-0011](0011-matriz-autorizacion-por-rol.md) — La matriz de autorización por rol vive en un solo archivo

```yaml
id: 0011
title: Matriz de autorización por rol como fuente única (Q-21 / RG-03), con fallback fail-closed y verificación por reflexión
status: accepted
date: 2026-09-29
decided_by: Owner (opción A de Q-21, 2026-09-29: escrituras exactas a la Ley; Admin y Supervisor solo lectura) · implementación y verificación por el agente técnico
relacionado: [Q-21](../SDD.md#91-preguntas-al-owner-abiertas), [ADR-0009](0009-autenticacion-jwt-rg01.md), [ADR-0006](0006-resolucion-contradiccion-ley-addendum.md), [Presentation/02-authorization.md](../Presentation/02-authorization.md)
```

## Contexto

`ADR-0009` cerró RG-01 (**quién eres**) pero dejó abierta RG-03 (**qué puedes hacer**): la política
de reserva exigía *un* token, y cualquier token servía para cualquier ruta. Consecuencia concreta
y verificada: un **Comprador** con token legítimo obtenía `GET /api/users` con la lista completa de
usuarios del sistema y podía crear Vendedores; un **Supervisor** (rol de auditoría) podía escribir
inventario.

Mapear las 30 acciones a la Matriz de Responsabilidades de `ZENTRIC.md` §12 no era un problema de
código sino de **decisiones de negocio** (Q-21). El Owner dictó la opción A: las escrituras van
exactas como las fija la Ley, y Administrador y Supervisor reciben solo lectura de pedidos,
despachos, devoluciones y facturas.

Quedaba la decisión de ingeniería: **dónde** vive esa matriz, que es lo que este ADR cierra. El
riesgo a mitigar es el de siempre en autorización: **la ruta que alguien olvidó decorar**.

## Decisiones

### 1. Un solo archivo define la matriz: `Zentric.Api/Security/AuthorizationPolicies.cs`

Diccionario `RolesByPolicy: política → roles`, con las claves como constantes `public const string`.

| Alternativa | Por qué se descartó |
|---|---|
| **(a) `[Authorize(Roles = "Seller,Administrator")]` literal en cada controlador** | La matriz queda replicada en 30 sitios; un cambio de regla exige tocar 9 archivos y nada avisa si una ruta se queda fuera. El literal de texto no se rompe al renombrar un valor de `UserRole` |
| **(b) Diccionario en `Api/Security` + constantes** ✅ | Una lectura = la matriz completa; el registro de políticas y los tests la recorren; `Role(UserRole.Seller)` hace que **renombrar un valor del enum rompa la compilación**, no producción |
| **(c) Políticas como interfaces en `Zentric.Application`** | Rompe la regla de dependencias: la autorización HTTP es un asunto del adaptador de entrada, y `Application` no debe conocer ASP.NET Core ([AGENTS.md §2.1](../../AGENTS.md#21-regla-de-dependencia-estricta-y-aislamiento-de-capas)) |
| **(d) Roles y permisos en base de datos, editables en caliente** | La Matriz §12 es **Ley**, no configuración: si un permiso puede cambiarse sin deploy, deja de ser auditable contra `ZENTRIC.md`. Además exigiría caché e invalidación en cada petición |

### 2. `FallbackPolicy = RequireAuthenticatedUser()` en lugar de `DefaultPolicy`

`DefaultPolicy` cambia el significado de "sin decorar" (pasa lo que diga la default); `FallbackPolicy`
significa **"sin decorar = denegado"**, y obliga a que el anonimato sea una decisión escrita. Un
endpoint nuevo que nazca sin atributo nace **cerrado**. Esto incluye a los endpoints mínimos: por eso
`/health` lleva su `.AllowAnonymous()` explícito.

### 3. Las dos excepciones anónimas se resuelven donde nacen

`POST /api/users` es anónimo **solo para `role = Buyer`**. No se modela como política: la condición es
el rol *pedido* en el cuerpo, no el rol del llamante, y encaja en la guarda que ya existía en
`UsersController` (Dominio 3). La matriz de políticas no intenta expresar lo que no expresa.

### 4. La matriz se verifica por reflexión, no por costumbre

`EndpointAuthorizationMatrixTests` (7 casos) carga el ensamblado `Zentric.Api`, recorre las acciones
de los controladores y aserta tres cosas: ninguna acción carece de política o de `[AllowAnonymous]`
explícito; la política de cada acción es la que dicta la tabla de
[Presentation/02-authorization.md](../Presentation/02-authorization.md); y ninguna política registrada
queda **muerta** (definida y no usada por nadie). Añade tres aserciones puntuales de la Ley:
`InventoryManagement` no incluye Supervisor, `ReturnApprove` solo incluye Seller, y los cinco valores
de `UserRole` aparecen en la matriz.

Para esto el proyecto de pruebas referencia `Zentric.Api` y añade
`FrameworkReference Microsoft.AspNetCore.App` (el Sdk de pruebas es genérico y no trae los atributos
de ASP.NET Core); con ello aparecieron dos `PackageReference` redundantes avisados con `NU1510`, que
se eliminaron.

## Consecuencias

**Positivas**

- RG-03 deja de ser declarativa: 33 comprobaciones con tokens reales de los cinco roles, `0` fallos.
- El Administrador **no** aprueba devoluciones (`403` en vivo), que es lo que dice el ADDENDUM
  Dominio 10 y no lo que sugerían las filas antiguas de la Matriz §12. La colisión queda resuelta en
  el código con la misma regla de precedencia de
  [ADR-0006](0006-resolucion-contradiccion-ley-addendum.md).
- Una ruta nueva sin autorización es **imposible de aprobar en review a simple vista**: o declara
  política, o declara anonimato, o falla la suite.
- `UserRole` pasa a ser consumido por la capa de presentación sin literales de texto.

**Negativas / coste asumido**

- **El `403` llega antes que la regla de negocio**: un cliente que antes recibía `400` por payload
  inválido ahora recibe `403` si su rol no entra. El frontend debe tratar `403` como caso normal, no
  como error del servidor.
- La matriz **no cubre propiedad del recurso**: un Comprador con permiso de lectura de facturas puede
  leer la factura de otro pedido mientras no exista el filtro por `sub`. Queda abierto como **Q-21b**,
  con `GET /api/orders/{id}` como único precedente implementado.
- `Frontend-Role-Modules.md` (documento del cliente) contradice la matriz en cuatro puntos; se listan
  en [Presentation/02-authorization.md §6](../Presentation/02-authorization.md#6-conflictos-detectados-con-el-contrato-de-frontend)
  y generan Q-21d/Q-21e. El backend no afloja la matriz.
- Un `[AllowAnonymous]` puesto "para probar" pasa la suite de reflexión: lo frena el fuego real y el
  review, no el test. Por eso el smoke queda documentado, no solo ejecutado.

## Verificación

- `dotnet build Zentric.slnx` → **0 errores, 0 avisos** (los `NU1510` del proyecto de pruebas
  desaparecieron al quitar los paquetes redundantes).
- `dotnet test Zentric.slnx` → **348/348 PASS** (341 previos + 7 de la matriz).
- Prueba de mutación: añadir `Administrator` a `ReturnApprove` → `Failed: 1, Passed: 6`; revertido y
  verificado (`ReturnApprove = { Seller }`).
- `docker compose build api` + `docker compose up -d api` → `/health` `200`; smoke de 33
  comprobaciones con tokens de Comprador, Vendedor, Operador Logístico, Supervisor y Administrador →
  `TOTAL DE COMPROBACIONES: 33 | FALLOS: 0`. Detalle en
  [Presentation/02-authorization.md §4](../Presentation/02-authorization.md#4-verificación-de-la-matriz).
- Limpieza post-smoke: `DELETE FROM "Users" WHERE "Email" LIKE '%q21.test%'` → `DELETE 5`; queda `1`
  usuario (el Administrador del bootstrap).
