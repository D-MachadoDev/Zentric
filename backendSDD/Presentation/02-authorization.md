# Presentación — Autorización y Matriz de Roles

> Especificación canónica y Fuente Única de Verdad (SSoT) para el control de acceso basado en roles, políticas de autorización y aislamiento por propiedad de recurso en la API de Zentric.

---

## 1. Principios Operativos y Reglas de Seguridad

La seguridad de la API descansa sobre el principio de **cero confianza y mínimo privilegio**, garantizando que ningún participante del marketplace pueda consultar o alterar información ajena a su responsabilidad operativa:

1. **Política de Reserva Inviolable (*Fail-Closed*):** Todo endpoint de la API exige autenticación de forma predeterminada mediante la política de reserva del sistema. Si una nueva ruta se agrega sin decoradores explícitos, **nace cerrada** y responde `401 Unauthorized` ante solicitudes anónimas.
2. **Anonimato Restringido por Ley:** Solo existen tres rutas con acceso público anónimo explícito (`[AllowAnonymous]`):
   - `POST /api/auth/login`: Para la emisión de credenciales de sesión.
   - `POST /api/users` *(restringido exclusivamente a solicitudes con rol Comprador `Buyer`)*: Para permitir el alta inicial de nuevos clientes.
   - `GET /health`: Sonda de diagnóstico para el orquestador de contenedores y balanceadores de carga.
3. **Definición Centralizada de Roles:** Los controladores tienen estrictamente prohibido utilizar literales de texto dispersos para comprobar roles. Toda validación de autorización se realiza a través de las políticas declaradas en la matriz canónica (`AuthorizationPolicies`).
4. **Respuesta Estandarizada ante Rechazo:**
   - Si no se suministra un token válido o ha caducado: `401 Unauthorized`.
   - Si el llamante presenta un token válido pero su rol no está autorizado para la política del endpoint: `403 Forbidden` servido con Problem Details (RFC 7807).
5. **Aislamiento por Propiedad de Recurso (*Resource Ownership*):** Superar la barrera del rol no garantiza el acceso; para los roles comerciales (Comprador y Vendedor), el sistema aplica una segunda barrera que restringe la operación exclusivamente a los recursos de su propiedad.

---

## 2. Catálogo Canónico de Políticas de Autorización

La siguiente tabla define las 21 políticas de autorización registradas en el contenedor de dependencias del sistema y los roles autorizados para cada una:

| Política de Seguridad | Roles Autorizados | Fundamento de Negocio y Reglas de la Ley |
|---|---|---|
| `AnyAuthenticatedUser` | *Cualquier usuario autenticado* | Operaciones comunes donde la identidad está confirmada y no se requiere un privilegio administrativo específico (ej. consulta del perfil propio o catálogo público). |
| `UserAdministration` | `Administrator` | Alta, bloqueo y reactivación de usuarios privilegiados (Vendedores, Operadores Logísticos y Supervisores). |
| `WarehouseManagement` | `Administrator` | Registro formal y configuración volumétrica de bodegas físicas en la red de almacenamiento. |
| `WarehouseRead` | `Administrator`, `Seller`, `LogisticsOperator` | Consulta de la red de bodegas para gestión de existencias y operaciones de despacho. El comprador queda excluido. |
| `ProductManagement` | `Seller` | Alta, publicación, suspensión y mantenimiento de fichas técnicas de productos en el catálogo comercial. |
| `InventoryManagement` | `Seller`, `LogisticsOperator` | Carga e ingreso de existencias físicas en bodega (unidades nuevas y reacondicionadas). |
| `InventoryRead` | `Seller`, `LogisticsOperator` | Consulta técnica de existencias distribuidas por bodega y variante. |
| `InventoryAdjust` | `Administrator`, `Supervisor` | Ajuste de stock por conteo físico en bodega. Función de auditoría y conciliación operativa; excluida para vendedores y operadores para evitar conflictos de interés. |
| `Checkout` | `Buyer` | Inicialización de carritos, adición de líneas de compra, confirmación de pedidos y procesamiento de recaudo. |
| `OrderRead` | `Buyer`, `Seller`, `LogisticsOperator`, `Administrator`, `Supervisor` | Consulta de pedidos de compra. Para Comprador y Vendedor se aplica filtro forzado por propiedad de recurso. |
| `FulfillmentOperate` | `Seller`, `LogisticsOperator` | Creación de órdenes logísticas, preparación física y empaque en bodega (`Packed`). |
| `FulfillmentDeliver` | `LogisticsOperator` | Certificación de entrega física del paquete al comprador (`Delivered`). **Exclusivo para el Operador Logístico**; el vendedor tiene prohibido certificar la entrega de su propio despacho. |
| `FulfillmentCancelByQuiebre` | `Seller`, `LogisticsOperator` | Cancelación unilateral por faltante físico en bodega (*stock fantasma*), generando la devolución y reembolso obligatorio al comprador. |
| `FulfillmentRead` | `Buyer`, `Seller`, `LogisticsOperator`, `Administrator`, `Supervisor` | Consulta y seguimiento de órdenes logísticas, despachos y números de guía de transporte. |
| `ReturnRequest` | `Buyer` | Radicación de solicitudes de devolución por garantía sobre productos previamente entregados. |
| `ReturnInspect` | `LogisticsOperator` | Registro del dictamen técnico de inspección física en bodega sobre mercancía devuelta. |
| `ReturnApprove` | `Seller` | Resolución comercial de la devolución (aprobación o rechazo definitivo). **Exclusivo para el Vendedor dueño del producto**; la administración no puede aprobar devoluciones comerciales. |
| `ReturnRefund` | `Administrator` | Emisión y acreditación del reembolso monetario para devoluciones aprobadas. **Exclusivo para el Administrador** por principio de separación de funciones sobre fondos de la plataforma. |
| `ReturnRead` | `Buyer`, `Seller`, `LogisticsOperator`, `Administrator`, `Supervisor` | Consulta del expediente y estado de trámites de devolución y garantía. |
| `BillingGenerate` | `Administrator` | Emisión y anulación de Facturas Maestras y facturación split. **Exclusivo para el Administrador**. |
| `BillingRead` | `Buyer`, `Seller`, `Administrator`, `Supervisor` | Consulta de facturas emitidas. El operador logístico no participa en este módulo tributario. |

---

## 3. Matriz Exhaustiva por Endpoint (45 Endpoints)

La siguiente matriz vincula cada una de las 45 rutas HTTP de la API con su política de autorización correspondiente y los roles con acceso efectivo:

| Método | Endpoint | Política Asociada | Roles con Acceso Efectivo | Barrera Adicional de Propiedad |
|---|---|---|---|:---:|
| `POST` | `/api/auth/login` | *(Acceso Anónimo)* | Público general | No |
| `GET` | `/api/auth/me` | `AnyAuthenticatedUser` | Todos los roles autenticados | No |
| `POST` | `/api/users` | *(Guarda en Controlador)* | Anónimo solo si `role = "Buyer"`; Administrador para otros roles | No |
| `GET` | `/api/users` | `UserAdministration` | `Administrator` | No |
| `GET` | `/api/users/{id}` | `UserAdministration` | `Administrator` | No |
| `POST` | `/api/users/{id}/block` | `UserAdministration` | `Administrator` | No |
| `POST` | `/api/users/{id}/activate` | `UserAdministration` | `Administrator` | No |
| `POST` | `/api/warehouses` | `WarehouseManagement` | `Administrator` | No |
| `GET` | `/api/warehouses` | `WarehouseRead` | `Administrator`, `Seller`, `LogisticsOperator` | Sí *(Vendedor solo sus bodegas)* |
| `GET` | `/api/warehouses/{id}` | `WarehouseRead` | `Administrator`, `Seller`, `LogisticsOperator` | Sí *(Vendedor solo sus bodegas)* |
| `POST` | `/api/catalog/products` | `ProductManagement` | `Seller` | Sí *(Se atribuye al vendedor del token)* |
| `POST` | `/api/catalog/products/{productId}/publish` | `ProductManagement` | `Seller` | Sí *(Solo productos propios)* |
| `POST` | `/api/catalog/products/{productId}/suspend` | `ProductManagement` | `Seller` | Sí *(Solo productos propios)* |
| `GET` | `/api/catalog/products` | `AnyAuthenticatedUser` | Todos los roles autenticados | Sí *(Solo productos publicados, salvo el vendedor que consulta los propios)* |
| `GET` | `/api/catalog/products/paged` | `AnyAuthenticatedUser` | Todos los roles autenticados | Sí *(Misma regla de visibilidad)* |
| `GET` | `/api/catalog/products/{id}` | `AnyAuthenticatedUser` | Todos los roles autenticados | No |
| `POST` | `/api/inventories/stock` | `InventoryManagement` | `Seller`, `LogisticsOperator` | Sí *(Vendedor solo sus productos y bodegas)* |
| `POST` | `/api/inventories/{id}/adjust` | `InventoryAdjust` | `Administrator`, `Supervisor` | No |
| `GET` | `/api/inventories/{variantId}` | `InventoryRead` | `Seller`, `LogisticsOperator` | Sí *(Vendedor solo sus productos)* |
| `GET` | `/api/inventories` | `InventoryRead` | `Seller`, `LogisticsOperator` | Sí *(Vendedor solo sus productos)* |
| `POST` | `/api/orders/cart` | `Checkout` | `Buyer` | Sí *(Carrito a nombre del comprador del token)* |
| `POST` | `/api/orders/cart/items` | `Checkout` | `Buyer` | Sí *(Solo sobre carritos propios)* |
| `POST` | `/api/orders/{orderId}/checkout` | `Checkout` | `Buyer` | Sí *(Solo sobre pedidos propios)* |
| `POST` | `/api/orders/{orderId}/pay` | `Checkout` | `Buyer` | Sí *(Solo sobre pedidos propios)* |
| `GET` | `/api/orders` | `OrderRead` | Todos los roles autenticados | Sí *(Comprador: sus compras; Vendedor: sus líneas)* |
| `GET` | `/api/orders/{id}` | `OrderRead` | Todos los roles autenticados | Sí *(Vendedor: vista filtrada; Comprador: solo propio)* |
| `POST` | `/api/logistics/fulfillment` | `FulfillmentOperate` | `Seller`, `LogisticsOperator` | Sí *(Vendedor solo a su nombre)* |
| `POST` | `/api/logistics/fulfillment/{id}/pack` | `FulfillmentOperate` | `Seller`, `LogisticsOperator` | Sí *(Vendedor solo sus paquetes)* |
| `POST` | `/api/logistics/fulfillment/{id}/dispatch` | `FulfillmentOperate` | `Seller`, `LogisticsOperator` | Sí *(Vendedor solo sus paquetes)* |
| `POST` | `/api/logistics/fulfillment/{id}/deliver` | `FulfillmentDeliver` | `LogisticsOperator` *(Exclusivo)* | No |
| `POST` | `/api/logistics/fulfillment/cancel-ghost-stock` | `FulfillmentCancelByQuiebre` | `Seller`, `LogisticsOperator` | Sí *(Vendedor solo sus despachos)* |
| `GET` | `/api/logistics/fulfillments` | `FulfillmentRead` | Todos los roles autenticados | Sí *(Vendedor solo sus despachos)* |
| `GET` | `/api/logistics/fulfillment/{id}` | `FulfillmentRead` | Todos los roles autenticados | Sí *(Vendedor y Comprador solo despachos propios)* |
| `POST` | `/api/returns/request` | `ReturnRequest` | `Buyer` | Sí *(Solo sobre pedidos propios)* |
| `POST` | `/api/returns/{id}/inspect` | `ReturnInspect` | `LogisticsOperator` | No |
| `POST` | `/api/returns/{id}/approve` | `ReturnApprove` | `Seller` *(Exclusivo)* | Sí *(Solo devoluciones de productos propios)* |
| `POST` | `/api/returns/{id}/reject` | `ReturnApprove` | `Seller` *(Exclusivo)* | Sí *(Solo devoluciones de productos propios)* |
| `POST` | `/api/returns/{id}/refund` | `ReturnRefund` | `Administrator` *(Exclusivo)* | No |
| `GET` | `/api/returns` | `ReturnRead` | Todos los roles autenticados | Sí *(Comprador: sus pedidos; Vendedor: sus productos)* |
| `GET` | `/api/returns/{id}` | `ReturnRead` | Todos los roles autenticados | Sí *(Comprador y Vendedor solo trámites propios)* |
| `POST` | `/api/billing/invoices/generate/{orderId}` | `BillingGenerate` | `Administrator` *(Exclusivo)* | No |
| `POST` | `/api/billing/invoices/annul/{orderId}` | `BillingGenerate` | `Administrator` *(Exclusivo)* | No |
| `GET` | `/api/billing/invoices` | `BillingRead` | `Buyer`, `Seller`, `Administrator`, `Supervisor` | Sí *(Vendedor solo sus facturas de detalle)* |
| `GET` | `/api/billing/invoices/order/{orderId}` | `BillingRead` | `Buyer`, `Seller`, `Administrator`, `Supervisor` | Sí *(Comprador: Maestra propia; Vendedor: la suya)* |
| `GET` | `/health` | *(Acceso Anónimo)* | Público general | No |

---

## 4. Reglas de Propiedad de Recurso (*Resource Ownership*)

La autorización por rol responde a la pregunta **¿qué tipo de acción puede ejecutar este actor?**. La propiedad de recurso responde a la pregunta **¿sobre cuáles registros específicos puede operar?**:

1. **Inyección Inmutable de Identidad:** La identidad del actor se toma directamente del claim `sub` del token validado mediante el componente `ClaimsUserAccessor`. Los controladores descartan cualquier identificador de usuario o vendedor enviado en el cuerpo JSON de la petición.
2. **Filtrado en Motor de Datos:** El aislamiento de datos se aplica **dentro de la consulta en base de datos** (`WHERE`), nunca trayendo todos los registros a memoria para descartarlos posteriormente.
3. **Respuesta Indistinguible ante Recursos Ajenos (`404 Not Found`):** Intentar leer, pagar, cancelar o modificar un recurso perteneciente a otro usuario responde exactamente con el mismo código `404 Not Found` que un recurso inexistente. Esto impide que un atacante descubra qué identificadores existen mediante pruebas de fuerza bruta.
4. **Diferenciación de Vistas por Rol en Pedidos:**
   - Comprador y Administración: Reciben el pedido completo (`OrderDto`) con el importe total acumulado y todas las líneas.
   - Vendedor: Recibe una vista restringida (`SellerOrderViewDto`) que expone únicamente los artículos vendidos por él y su respectivo subtotal, ocultando el comprador y los productos de otros vendedores en pedidos multi-vendedor.

---

## 5. Verificación Automatizada y Evidencia

La matriz de seguridad se valida exhaustivamente mediante tres mecanismos de control:

1. **Verificación por Reflexión (`EndpointAuthorizationMatrixTests`):**
   - Comprueba que el 100% de las acciones de los controladores declaren explícitamente `[Authorize(Policy = ...)]` o `[AllowAnonymous]`.
   - Comprueba que ninguna política declarada discrepe de la matriz canónica y que no existan políticas registradas sin uso.
2. **Pruebas de Mutación:**
   - Confirmación de que cualquier adición no autorizada de roles (ej. agregar `Administrator` a `ReturnApprove`) hace fallar inmediatamente la suite de pruebas.
3. **Verificación Integral de la Solución:**
   - Compilación estricta con advertencias tratadas como errores (`dotnet build -warnaserror`).
   - Ejecución completa de la suite unitaria con 457 pruebas en verde.
