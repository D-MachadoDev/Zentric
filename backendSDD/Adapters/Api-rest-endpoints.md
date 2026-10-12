# Endpoints REST de la API

> Especifica **que rutas existen, que aceptan y que devuelven**. La implementacion vive en `Zentric.Api/Controllers/`.

## Donde esta el detalle

La tabla completa, endpoint por endpoint, con su codigo HTTP, su carga util y sus invariantes de
negocio, esta en **[`../Presentation/01-endpoints.md`](../Presentation/01-endpoints.md)**.

Aqui queda solo el indice y las reglas transversales, para no duplicar la especificacion: un mismo
endpoint descrito en dos sitios acaba siendo contradiccion cuando uno se actualiza y el otro no.

## Indice por contexto acotado

**44 endpoints** repartidos en 9 controladores. La ruta base de cada controlador es `api/<nombre>`
en minusculas (`[Route("api/[controller]")]`), salvo el prefijo indicado.

| Controlador             | Contexto          | Ruta base          | N.o | Endpoints                                                                                                                                                                                                    |
| ----------------------- | ----------------- | ------------------ | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AuthController`        | Sesion            | `/api/auth`        | 2   | `POST login` · `GET me`                                                                                                                                                                                      |
| `UsersController`       | Identidad y roles | `/api/users`       | 5   | `POST` · `GET` · `GET {id}` · `POST {id}/block` · `POST {id}/activate`                                                                                                                                       |
| `CatalogController`     | Catalogo          | `/api/catalog`     | 6   | `POST products` · `POST products/{productId}/publish` · `POST products/{productId}/suspend` · `GET products` · `GET products/paged` · `GET products/{id}`                                                                                          |
| `WarehousesController`  | Bodegas           | `/api/warehouses`  | 3   | `POST` · `GET` · `GET {id}`                                                                                                                                                                                  |
| `InventoriesController` | Existencias       | `/api/inventories` | 3   | `POST stock` · `GET` · `GET {variantId}`                                                                                                                                                                     |
| `OrdersController`      | Carrito y pedidos | `/api/orders`      | 6   | `GET` · `POST cart` · `POST cart/items` · `POST {orderId}/checkout` · `POST {orderId}/pay` · `GET {id}`                                                                                                      |
| `LogisticsController`   | Despachos         | `/api/logistics`   | 7   | `POST fulfillment` · `POST fulfillment/{id}/pack` · `POST fulfillment/{id}/dispatch` · `POST fulfillment/{id}/deliver` · `POST fulfillment/cancel-ghost-stock` · `GET fulfillments` · `GET fulfillment/{id}` |
| `ReturnsController`     | Devoluciones      | `/api/returns`     | 7   | `POST request` · `POST {id}/inspect` · `POST {id}/approve` · `POST {id}/reject` · `POST {id}/refund` · `GET` · `GET {id}`                                                                                    |
| `BillingController`     | Facturacion       | `/api/billing`     | 4   | `POST invoices/generate/{orderId}` · `POST invoices/annul/{orderId}` · `GET invoices` · `GET invoices/order/{orderId}`                                                                                                                         |
| —                       | Salud             | `/health`          | 1   | Mapeado en `Program.cs`, no en un controlador. Anonimo.                                                                                                                                                      |

> **Totales:** 44 en controladores + `/health` = **45 rutas**.

Las columnas `N.o` y `Endpoints` se obtuvieron leyendo los atributos `[Http*]` de los controladores
reales, no de una lista escrita a mano: una tabla paralela al codigo se desincroniza sola. **La
descripcion de negocio de cada endpoint** (que acepta, que devuelve, que invariantes aplica y con
que politica se autoriza) esta en [`../Presentation/01-endpoints.md`](../Presentation/01-endpoints.md),
que es la fuente unica para eso. Este documento no la duplica: la indexa.

## Reglas transversales del contrato HTTP

Estas reglas aplican a **todos** los endpoints. Un endpoint que las incumpla esta mal aunque su
propia fila de la tabla parezca correcta.

1. **Ningun endpoint convierte una operacion real en un `200` vacio.** Si una ruta existe, ejecuta
   su caso de uso. Una ruta que devuelve un cuerpo fijo sin hacer nada cuenta como no implementada.
2. **Los codigos HTTP significan lo que dicen.** `201` cuando se crea un recurso, `202` cuando se
   acepta para proceso asincrono, `204` cuando no hay cuerpo, `400` cuando la peticion es invalida,
   `401` sin identidad, `403` sin permiso, `404` cuando no existe **o no pertenece al llamante**.
3. **`404` unifica "no existe" y "no es tuyo".** Devolver mensajes distintos permitiria enumerar
   recursos ajenos probando GUIDs. Es una decision de seguridad, no un descuido.
4. **Los errores van en `application/problem+json`**, no en JSON libre. Ver
   [Global-exception-handler.md](Global-exception-handler.md).
5. **La identidad viaja en `Authorization: Bearer`.** Ningun endpoint acepta identidad por cabecera
   propia: una cabecera la escribe cualquiera y no autentica a nadie.
6. **Los `enum` viajan solo por nombre** en el cuerpo JSON. Un entero se rechaza con `400`
   ([ADR-0012](../Adr/0012-contrato-json-de-los-enum-por-nombre.md)).
7. **Todo endpoint exige token**, salvo los explicitamente anonimos. La politica por defecto es
   cerrada: una ruta nueva sin politica declarada queda bloqueada, no abierta.

## Verificacion

La existencia y el comportamiento de estas rutas se comprueba por HTTP real contra PostgreSQL
efimero, no solo por reflexion. Ver [ADR-0016](../Adr/0016-pruebas-e2e-http-con-postgres-efimero.md).
