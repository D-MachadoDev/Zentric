# [ADR-0013](0013-propiedad-del-recurso-por-rol.md) — La propiedad del recurso se comprueba por rol, con la identidad de vendedor derivada del token (Q-21b)

```yaml
id: 0013
title: Propiedad del recurso por rol, con identidad de vendedor derivada del token (Q-21b)
status: accepted
date: 2026-09-29
decided_by: Owner (opción A "estricta completa" + P1–P4 de la ronda 2, 2026-09-29) · implementación y verificación por el agente técnico
relacionado: [Q-21b](../SDD.md#91-preguntas-al-owner-abiertas), [ADR-0011](0011-matriz-autorizacion-por-rol.md), [ADR-0009](0009-autenticacion-jwt-rg01.md), [ADR-0012](0012-contrato-json-de-los-enum-por-nombre.md), [Presentation/02-authorization.md](../Presentation/02-authorization.md)
```

## Contexto

[ADR-0011](0011-matriz-autorizacion-por-rol.md) respondió a **qué puede hacer** cada rol, pero dejó
abierto **sobre qué recurso**: la matriz autoriza por rol, no por dueño. El síntoma que la dejó
escrita fue que un Comprador podía leer las facturas de un pedido ajeno; al verificar el código
resultó que el radio era mayor y que el hueco no era solo de lectura:

| Frente | Qué se podía hacer (verificado leyendo el código) |
|---|---|
| Lecturas | Un Comprador leía las facturas de cualquier pedido (incluida la comisión de plataforma y las facturas de otros vendedores); las devoluciones y los despachos se leían por rol; el inventario de una variante lo veía cualquier Vendedor en todas las bodegas |
| Listados | El Vendedor veía todas las bodegas y podía filtrar por el `vendorId` de otro |
| Escrituras | Un Comprador podía crear un carrito a nombre de otro, agregar ítems, hacer checkout y **pagar** un pedido ajeno, y radicar devoluciones contra pedidos ajenos; un Vendedor podía registrar productos, ingresar stock, crear despachos, despachar, aprobar devoluciones y cancelar despachos de otros |

Además apareció un fallo en sentido contrario: `GET /api/orders/{id}` filtraba por
`BuyerId == sub` sin mirar el rol, así que un Vendedor, un Operador, un Administrador y un
Supervisor recibían **404 siempre**, contradiciendo tanto la matriz como el dictamen de
[ADR-0011](0011-matriz-autorizacion-por-rol.md) de que leen sin filtro.

El Owner dictó la **opción A (estricta completa)** y confirmó en una segunda ronda las cuatro
decisiones que colgaban de ella.

## Decisiones

### 1. Solo Comprador y Vendedor llevan filtro de dueño; el Operador es transversal

| Rol | Lectura | Escritura |
|---|---|---|
| Comprador | Solo lo suyo (Dominio 2: nunca administra información de otros compradores) | Solo lo suyo |
| Vendedor | Solo lo suyo (variante→producto suyo, o pedido donde tiene líneas) | Solo lo suyo |
| Operador Logístico | Sin filtro: el stock y el despacho de la red son su trabajo | Sin filtro: la recepción y el despacho en bodega son su trabajo |
| Administrador / Supervisor | Sin filtro (dictamen de [ADR-0011](0011-matriz-autorizacion-por-rol.md): solo lectura) | Sin filtro de dueño; los procesos de negocio siguen la matriz |

El Operador no se encerró en "sus" bodegas porque no existe asignación de bodegas a operadores
en el modelo: encerrarlo habría dejado al Operador sin poder operar la red.

### 2. El `VendorId` de un vendedor es su `User.Id` (P1)

No existe agregado `Vendor` ni vínculo entre `User` y el `VendorId` que viven en producto,
bodega, línea de pedido, despacho y factura de vendedor. Sin una convención, "es mío" no es
expresable.

| Alternativa | Por qué se descartó |
|---|---|
| **(`VendorId = User.Id` del vendedor)** ✅ | Es el mismo 1:1 que ya usa el Comprador (`Buyer.UserId` es el `User.Id`). Cero migración, cero entidades nuevas, y el `sub` del token ya lo trae. Un `Vendor` que naciera más adelante con `Id = User.Id` no rompería nada |
| Agregado `Vendor` con Id propio | Es la opción más fiel si mañana un vendedor es una empresa con varios usuarios, pero exige entidad, migración, flujo de alta y **redefine el significado de todos los `VendorId` existentes**. Es una épica propia, no un añadido de Q-21b |

### 3. La vista del vendedor sobre un pedido es filtrada (P2)

Un carrito puede traer líneas de varios vendedores. El Vendedor recibe el estado del pedido, sus
propias líneas y su subtotal; no el total completo, ni el `BuyerId`, ni las líneas ajenas.

| Alternativa | Por qué se descartó |
|---|---|
| **(Vista filtrada: `SellerOrderViewDto`)** ✅ | Mantiene el ✔ de "Gestión de Pedidos" de §12 sin filtrar precios y volúmenes de la competencia |
| El DTO completo del pedido | Filtraría datos de otros vendedores y del comprador en un solo pedido |
| Sin acceso a pedidos (solo despacho) | Habría dejado un hueco igual de grande: hoy no existe ningún endpoint que vaya de "el pedido X" a "mi despacho" (`GET /api/Logistics/fulfillment` de listado está anotado R-03 y no existe), así que el vendedor se quedaría sin contexto de su propio pedido |

### 4. Las facturas se reparten por rol (P3)

| Rol | Qué ve de `GET /api/billing/invoices/order/{orderId}` |
|---|---|
| Comprador | Solo la **Factura Maestra** de un pedido propio. El `ZentricDetail` es control interno de plataforma y las facturas de vendedor no son suyas (ADDENDUM Dominio 9) |
| Vendedor | Solo las facturas de vendedor con su `VendorId` (si no participó, la lista sale vacía) |
| Administrador, Supervisor | Todas, incluido el detalle de plataforma |

### 5. El dueño del stock es el dueño del producto (P4)

El Vendedor ve el stock de sus productos **estén donde estén** (incluida una bodega del
Marketplace, porque la Ley distingue "bodegas del Marketplace y bodegas de Vendedores"), e
ingresa stock solo de sus productos y solo en sus bodegas. El Operador ingresa y consulta en
toda la red.

El resto de los sub-puntos de P4: el Vendedor crea y despacha solo sus despachos; cancela por
quiebre solo los suyos (la **política sigue siendo solo-Vendedor**, Q-21c sigue abierta); el
Operador inspecciona cualquier devolución. `POST /api/Catalog/products` deja de aceptar el
vendedor en el cuerpo: lo toma del token.

## Dónde vive la comprobación

- **Identidad:** `ICurrentUserAccessor` (`Zentric.Api/Security/ClaimsUserAccessor.cs`) resuelve
  el `sub` del token ya validado. Los controladores componen el comando o la consulta con esa
  identidad, de modo que **el cuerpo nunca decide quién es el llamante**. Se renombró desde
  `ICurrentBuyerAccessor` porque el mismo valor identifica a cualquier rol.
- **Filtro:** en el handler o en el repositorio, nunca en el controlador. `GetByIdForBuyerAsync`
  y `GetByIdForVendorAsync` filtran en la consulta, para que el recurso ajeno no llegue a
  materializarse.
- **Respuesta:** `404` para un recurso que es de otro, con el mismo mensaje que el de uno
  inexistente, para no permitir enumeración por GUID. `403` sigue reservada al rol.

## Alternativas de ingeniería descartadas

| Alternativa | Por qué se descartó |
|---|---|
| **(Filtro por `sub` en el handler/repositorio)** ✅ | Es el precedente que ya existía (`GetOrderByIdForBuyerQuery`) y mantiene la propiedad dentro del caso de uso, no en la capa HTTP |
| Filtro en el controlador con `if (!owns) return 403` | Reparte la regla en 9 controladores y devuelve `403`, que revela que el recurso existe |
| Atributo de autorización con resource handler (`IAuthorizationRequirement`) | Compondría la propiedad con la matriz por rol en un único pipeline, pero exige que ASP.NET.Core entre en la capa Application, lo que rompe la regla de dependencias de [AGENTS.md §2.1](../../AGENTS.md#21-regla-de-dependencia-estricta-y-aislamiento-de-capas) |
| Rutas separadas por rol (p. ej. `/api/orders/{id}/mine`) | Duplica la superficie HTTP y deja la puerta abierta si alguien olvida usar la ruta nueva |

## Consecuencias

**Positivas**

- Q-21b queda cerrada y el frontend puede exponer listados sin arriesgarse a enseñar datos ajenos.
- Se reparó el 404 de más: Administrador, Supervisor, Operador y Vendedor vuelven a leer lo que
  la matriz les concede.
- `POST /api/orders/cart` y `POST /api/Catalog/products` ya no aceptan una identidad en el
  cuerpo: el contrato HTTP no tiene por dónde falsificarse.

**Negativas / coste asumido**

- **`GET /api/orders/{id}` devuelve una forma distinta según el rol** (`OrderDto` o
  `SellerOrderViewDto`): el cliente debe ramificar por rol, no un único esquema. Es el precio de
  la opción P2 y queda documentado para el frontend.
- **`GET /api/warehouses` devuelve `400`** cuando un Vendedor pide el listado de otro. Es
  deliberado: devolver en silencio las propias bodegas haría que el filtro pedido y el aplicado
  fueran distintos sin decirlo.
- **El `VendorId` es una convención, no una entidad.** Si un vendedor llega a ser una empresa
  con varios usuarios, habrá que migrar a un agregado `Vendor` (naciendo con `Id = User.Id` para
  no romper lo existente). Registrado como riesgo en [SDD.md §10](../SDD.md#10-riesgos-hallazgos-y-observaciones).
- **La batería E2E no cubre todavía estas rutas con datos reales**: el smoke sabe crear usuarios
  y comprobar puertas de rol, pero no crea el grafo completo (pedido pagado con líneas de dos
  vendedores, facturas emitidas, devoluciones) que estas comprobaciones necesitan. Registrado
  como T-032.

## Verificación

- `dotnet build Zentric.slnx -warnaserror` → **0 warnings, 0 errores**.
- `dotnet test Zentric.slnx` → **388/388** (353 previos + 35 de Q-21b: 4 escrituras del
  Comprador, 12 lecturas, 18 listados y escrituras del Vendedor, más 1 regla de validador).
- El smoke de autorización (`backend/scripts/authorization-smoke.ps1`) se extendió con las
  comprobaciones de propiedad que se pueden levantar sin datos previos; el detalle está en
  [Presentation/02-authorization.md §4](../Presentation/02-authorization.md#4-verificación-de-la-matriz).

