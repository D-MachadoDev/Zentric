# Servicios de Aplicación, Hooks de TanStack Query y Esquemas Zod (Frontend Domain Services)

> Especificación de la capa de aplicación del cliente web de **Zentric Marketplace** (`frontend/apps/frontend/src/application/` y `src/domain/rules/`).  
> Define la jerarquía determinista de claves de caché (`queryKeys.ts`), los 46 hooks de consulta y mutación sobre TanStack Query que orquestan los 45 endpoints de `ZentricApiPort`, las reglas puras de presentación del dominio y los 12 esquemas de validación Zod sincronizados línea por línea con los validadores `FluentValidation` del backend C#.

---

## 1. Principios de Orquestación en la Capa de Aplicación

1. **Identificadores en Inglés, Mensajes de Validación en Español:** Todos los nombres de archivos, hooks (`use*Query`, `use*Mutation`), esquemas Zod (`*Schema`) y funciones de dominio se escriben en inglés siguiendo el lenguaje ubicuo (`AGENTS.md` §0.4 y §5), mientras que los mensajes de error destinados al usuario se expresan en español claro.
2. **Validación Defensiva Sincronizada con el Servidor:** Cada formulario aplica un esquema Zod que replica las reglas de `FluentValidation` de `Zentric.Application`. Ninguna petición con formato inválido llega a emitirse por red.
3. **Autoridad Transaccional Exclusiva del Backend:** El frontend jamás calcula impuestos, comisiones de plataforma (`ZentricDetail`), subtotales netos de vendedor (`VendorDetail`) ni saldos de inventario; despacha la intención a través de `ZentricApiPort` e invalida las claves de caché afectadas.
4. **Inmutabilidad de la Sesión del Llamante:** Las mutaciones ejecutadas por el Administrador (como `useCreateUserMutation`, `useBlockUserMutation` o `useActivateUserMutation`) operan sobre terceros y jamás alteran el token ni la identidad activa en `SessionPort`.

---

## 2. Jerarquía Centralizada de Claves de Caché (`queryKeys.ts`)

El archivo `apps/frontend/src/application/services/queryKeys.ts` centraliza todas las claves de consulta de TanStack Query para garantizar invalidaciones deterministas tras cada mutación:

| Dominio | Clave Raíz de Invalidación | Claves de Lista y Filtro | Claves de Detalle / Subrecurso |
|---|---|---|---|
| **Salud** | `['health']` | — | — |
| **Autenticación** | `['auth']` | — | `['auth', 'me']` |
| **Usuarios** | `['users']` | `['users', 'list', { role }]` | `['users', 'detail', id]` |
| **Bodegas** | `['warehouses']` | `['warehouses', 'list', { vendorId }]` | `['warehouses', 'detail', id]` |
| **Inventarios** | `['inventories']` | `['inventories', 'list']` | `['inventories', 'variant', variantId]` |
| **Catálogo** | `['products']` | `['products', 'list', { vendorId }]`<br>`['products', 'paged', { page, size, vendorId }]` | `['products', 'detail', id]` |
| **Pedidos** | `['orders']` | `['orders', 'list', { status }]` | `['orders', 'detail', id]` |
| **Logística** | `['fulfillments']` | `['fulfillments', 'list', { status }]` | `['fulfillments', 'detail', id]` |
| **Devoluciones** | `['returns']` | `['returns', 'list', { status }]` | `['returns', 'detail', id]` |
| **Facturación** | `['invoices']` | `['invoices', 'list']` | `['invoices', 'order', orderId]` |

---

## 3. Catálogo Maestro de Hooks de Aplicación (45 Endpoints + Cierre de Sesión)

### 3.1 Módulo de Identidad y Usuarios (`application/services/identity.ts`)

| Hook | Tipo | Método de Puerto Invocado | Efecto en Caché / Sesión | Procedencia Backend (`archivo:línea`) |
|---|---|---|---|---|
| **`useLoginMutation`** | Mutation | `ZentricApiPort.login` | Guarda token y perfil en `SessionPort`; establece `['auth', 'me']` | [`AuthController.cs:47`](../backend/Zentric.Api/Controllers/AuthController.cs#L47) |
| **`useCurrentUserQuery`** | Query | `ZentricApiPort.getCurrentUser` | Lee y cachea `['auth', 'me']` | [`AuthController.cs:78`](../backend/Zentric.Api/Controllers/AuthController.cs#L78) |
| **`useLogoutMutation`** | Local | `SessionPort.clear` | Purga memoria RAM y ejecuta `queryClient.clear()` | [`ADR-0009`](../backendSDD/Adr/0009-autenticacion-jwt-rg01.md) |
| **`useUsersQuery`** | Query | `ZentricApiPort.listUsers` | Cachea `['users', 'list', { role }]` | [`UsersController.cs:101`](../backend/Zentric.Api/Controllers/UsersController.cs#L101) |
| **`useUserQuery`** | Query | `ZentricApiPort.getUserById` | Cachea `['users', 'detail', id]` | [`UsersController.cs:116`](../backend/Zentric.Api/Controllers/UsersController.cs#L116) |
| **`useCreateUserMutation`** | Mutation | `ZentricApiPort.createUser` | Invalida `['users']` (no altera la sesión del llamante) | [`UsersController.cs:69`](../backend/Zentric.Api/Controllers/UsersController.cs#L69) |
| **`useBlockUserMutation`** | Mutation | `ZentricApiPort.blockUser` | Invalida `['users']` | [`UsersController.cs:150`](../backend/Zentric.Api/Controllers/UsersController.cs#L150) |
| **`useActivateUserMutation`** | Mutation | `ZentricApiPort.activateUser` | Invalida `['users']` | [`UsersController.cs:176`](../backend/Zentric.Api/Controllers/UsersController.cs#L176) |

### 3.2 Módulo de Bodegas e Inventarios (`application/services/warehouses.ts`, `inventory.ts`)

| Hook | Tipo | Método de Puerto Invocado | Efecto en Caché | Procedencia Backend (`archivo:línea`) |
|---|---|---|---|---|
| **`useWarehousesQuery`** | Query | `ZentricApiPort.listWarehouses` | Cachea `['warehouses', 'list', { vendorId }]` | [`WarehousesController.cs:67`](../backend/Zentric.Api/Controllers/WarehousesController.cs#L67) |
| **`useWarehouseQuery`** | Query | `ZentricApiPort.getWarehouseById` | Cachea `['warehouses', 'detail', id]` | [`WarehousesController.cs:90`](../backend/Zentric.Api/Controllers/WarehousesController.cs#L90) |
| **`useCreateWarehouseMutation`** | Mutation | `ZentricApiPort.createWarehouse` | Invalida `['warehouses']` | [`WarehousesController.cs:44`](../backend/Zentric.Api/Controllers/WarehousesController.cs#L44) |
| **`useInventoriesQuery`** | Query | `ZentricApiPort.listInventories` | Cachea `['inventories', 'list']` | [`InventoriesController.cs:74`](../backend/Zentric.Api/Controllers/InventoriesController.cs#L74) |
| **`useInventoryByVariantQuery`** | Query | `ZentricApiPort.listInventoryByVariant` | Cachea `['inventories', 'variant', variantId]` | [`InventoriesController.cs:104`](../backend/Zentric.Api/Controllers/InventoriesController.cs#L104) |
| **`useAddStockMutation`** | Mutation | `ZentricApiPort.addStock` | Invalida `['inventories']` y `['products']` | [`InventoriesController.cs:46`](../backend/Zentric.Api/Controllers/InventoriesController.cs#L46) |
| **`useAdjustInventoryMutation`** | Mutation | `ZentricApiPort.adjustInventory` | Invalida `['inventories']` | [`InventoriesController.cs:138`](../backend/Zentric.Api/Controllers/InventoriesController.cs#L138) |

### 3.3 Módulo de Catálogo de Productos (`application/services/catalog.ts`)

| Hook | Tipo | Método de Puerto Invocado | Efecto en Caché | Procedencia Backend (`archivo:línea`) |
|---|---|---|---|---|
| **`useProductsQuery`** | Query | `ZentricApiPort.listProducts` | Cachea `['products', 'list', { vendorId }]` | [`CatalogController.cs:128`](../backend/Zentric.Api/Controllers/CatalogController.cs#L128) |
| **`useProductsPagedQuery`** | Query | `ZentricApiPort.listProductsPaged` | Cachea `['products', 'paged', { page, size, vendorId }]` | [`CatalogController.cs:156`](../backend/Zentric.Api/Controllers/CatalogController.cs#L156) |
| **`useProductQuery`** | Query | `ZentricApiPort.getProductById` | Cachea `['products', 'detail', id]` | [`CatalogController.cs:177`](../backend/Zentric.Api/Controllers/CatalogController.cs#L177) |
| **`useCreateProductMutation`** | Mutation | `ZentricApiPort.createProduct` | Invalida `['products']`; retorna `{ productId, variantIds }` | [`CatalogController.cs:47`](../backend/Zentric.Api/Controllers/CatalogController.cs#L47) |
| **`usePublishProductMutation`** | Mutation | `ZentricApiPort.publishProduct` | Invalida `['products']` | [`CatalogController.cs:76`](../backend/Zentric.Api/Controllers/CatalogController.cs#L76) |
| **`useSuspendProductMutation`** | Mutation | `ZentricApiPort.suspendProduct` | Invalida `['products']` | [`CatalogController.cs:107`](../backend/Zentric.Api/Controllers/CatalogController.cs#L107) |

### 3.4 Módulo de Carrito y Pedidos (`application/services/orders.ts`)

| Hook | Tipo | Método de Puerto Invocado | Efecto en Caché | Procedencia Backend (`archivo:línea`) |
|---|---|---|---|---|
| **`useOrdersQuery`** | Query | `ZentricApiPort.listOrders` | Cachea `['orders', 'list', { status }]` | [`OrdersController.cs:57`](../backend/Zentric.Api/Controllers/OrdersController.cs#L57) |
| **`useOrderQuery`** | Query | `ZentricApiPort.getOrderById` | Cachea `['orders', 'detail', id]` | [`OrdersController.cs:221`](../backend/Zentric.Api/Controllers/OrdersController.cs#L221) |
| **`useCreateCartMutation`** | Mutation | `ZentricApiPort.createCart` | Invalida `['orders']` | [`OrdersController.cs:106`](../backend/Zentric.Api/Controllers/OrdersController.cs#L106) |
| **`useAddCartItemMutation`** | Mutation | `ZentricApiPort.addCartItem` | Invalida `['orders', 'detail', orderId]` y `['orders', 'list']` | [`OrdersController.cs:132`](../backend/Zentric.Api/Controllers/OrdersController.cs#L132) |
| **`useCheckoutOrderMutation`** | Mutation | `ZentricApiPort.checkoutOrder` | Invalida `['orders']`, `['inventories']` y `['fulfillments']` | [`OrdersController.cs:162`](../backend/Zentric.Api/Controllers/OrdersController.cs#L162) |
| **`usePayOrderMutation`** | Mutation | `ZentricApiPort.payOrder` | Invalida `['orders']`, `['fulfillments']` y `['invoices']` | [`OrdersController.cs:189`](../backend/Zentric.Api/Controllers/OrdersController.cs#L189) |

### 3.5 Módulo de Logística y Despacho (`application/services/logistics.ts`)

| Hook | Tipo | Método de Puerto Invocado | Efecto en Caché | Procedencia Backend (`archivo:línea`) |
|---|---|---|---|---|
| **`useFulfillmentsQuery`** | Query | `ZentricApiPort.listFulfillments` | Cachea `['fulfillments', 'list', { status }]` | [`LogisticsController.cs:188`](../backend/Zentric.Api/Controllers/LogisticsController.cs#L188) |
| **`useFulfillmentQuery`** | Query | `ZentricApiPort.getFulfillmentById` | Cachea `['fulfillments', 'detail', id]` | [`LogisticsController.cs:238`](../backend/Zentric.Api/Controllers/LogisticsController.cs#L238) |
| **`useCreateFulfillmentMutation`** | Mutation | `ZentricApiPort.createFulfillment` | Invalida `['fulfillments']` | [`LogisticsController.cs:44`](../backend/Zentric.Api/Controllers/LogisticsController.cs#L44) |
| **`usePackFulfillmentMutation`** | Mutation | `ZentricApiPort.packFulfillment` | Invalida `['fulfillments']` | [`LogisticsController.cs:100`](../backend/Zentric.Api/Controllers/LogisticsController.cs#L100) |
| **`useDispatchFulfillmentMutation`** | Mutation | `ZentricApiPort.dispatchFulfillment` | Invalida `['fulfillments']`, `['orders']` y `['inventories']` | [`LogisticsController.cs:71`](../backend/Zentric.Api/Controllers/LogisticsController.cs#L71) |
| **`useDeliverFulfillmentMutation`** | Mutation | `ZentricApiPort.deliverFulfillment` | Invalida `['fulfillments']` y `['orders']` | [`LogisticsController.cs:129`](../backend/Zentric.Api/Controllers/LogisticsController.cs#L129) |
| **`useCancelGhostStockMutation`** | Mutation | `ZentricApiPort.cancelGhostStock` | Invalida `['fulfillments']`, `['orders']`, `['inventories']`, `['returns']` | [`LogisticsController.cs:154`](../backend/Zentric.Api/Controllers/LogisticsController.cs#L154) |

### 3.6 Módulo de Devoluciones y Garantías (`application/services/returns.ts`)

| Hook | Tipo | Método de Puerto Invocado | Efecto en Caché | Procedencia Backend (`archivo:línea`) |
|---|---|---|---|---|
| **`useReturnsQuery`** | Query | `ZentricApiPort.listReturns` | Cachea `['returns', 'list', { status }]` | [`ReturnsController.cs:187`](../backend/Zentric.Api/Controllers/ReturnsController.cs#L187) |
| **`useReturnQuery`** | Query | `ZentricApiPort.getReturnById` | Cachea `['returns', 'detail', id]` | [`ReturnsController.cs:236`](../backend/Zentric.Api/Controllers/ReturnsController.cs#L236) |
| **`useRequestReturnMutation`** | Mutation | `ZentricApiPort.requestReturn` | Invalida `['returns']` y `['orders']` | [`ReturnsController.cs:45`](../backend/Zentric.Api/Controllers/ReturnsController.cs#L45) |
| **`useInspectReturnMutation`** | Mutation | `ZentricApiPort.inspectReturn` | Invalida `['returns']` | [`ReturnsController.cs:72`](../backend/Zentric.Api/Controllers/ReturnsController.cs#L72) |
| **`useApproveReturnMutation`** | Mutation | `ZentricApiPort.approveReturn` | Invalida `['returns']` y `['inventories']` | [`ReturnsController.cs:95`](../backend/Zentric.Api/Controllers/ReturnsController.cs#L95) |
| **`useRejectReturnMutation`** | Mutation | `ZentricApiPort.rejectReturn` | Invalida `['returns']` | [`ReturnsController.cs:126`](../backend/Zentric.Api/Controllers/ReturnsController.cs#L126) |
| **`useRefundReturnMutation`** | Mutation | `ZentricApiPort.refundReturn` | Invalida `['returns']` y `['orders']` | [`ReturnsController.cs:155`](../backend/Zentric.Api/Controllers/ReturnsController.cs#L155) |

### 3.7 Módulo de Facturación Split y Salud (`application/services/billing.ts`, `health.ts`)

| Hook | Tipo | Método de Puerto Invocado | Efecto en Caché | Procedencia Backend (`archivo:línea`) |
|---|---|---|---|---|
| **`useInvoicesQuery`** | Query | `ZentricApiPort.listInvoices` | Cachea `['invoices', 'list']` | [`BillingController.cs:99`](../backend/Zentric.Api/Controllers/BillingController.cs#L99) |
| **`useInvoicesByOrderQuery`** | Query | `ZentricApiPort.getInvoicesByOrder` | Cachea `['invoices', 'order', orderId]` | [`BillingController.cs:128`](../backend/Zentric.Api/Controllers/BillingController.cs#L128) |
| **`useGenerateInvoicesMutation`** | Mutation | `ZentricApiPort.generateInvoices` | Invalida `['invoices']` y `['orders']` | [`BillingController.cs:45`](../backend/Zentric.Api/Controllers/BillingController.cs#L45) |
| **`useAnnulInvoicesMutation`** | Mutation | `ZentricApiPort.annulInvoices` | Invalida `['invoices']` | [`BillingController.cs:75`](../backend/Zentric.Api/Controllers/BillingController.cs#L75) |
| **`useHealthQuery`** | Query | `ZentricApiPort.getHealth` | Cachea `['health']` | [`Program.cs:276`](../backend/Zentric.Api/Program.cs#L276) |

---

## 4. Especificación Contractual de Esquemas Zod (`application/schemas/`)

Cada esquema Zod en `apps/frontend/src/application/schemas/` replica las restricciones exactas de los validadores `FluentValidation` del backend y las invariantes de las entidades de dominio:

| Esquema Zod | Validador / Comando en Backend C# (`archivo:línea`) | Campos, Tipos y Reglas de Validación Estrictas |
|---|---|---|
| **`LoginSchema`** | [`LoginCommandValidator.cs:9-19`](../backend/Zentric.Application/Users/Validators/LoginCommandValidator.cs#L9-L19) | • `email`: `string` recortado (`trim`), no vacío, formato de correo electrónico válido.<br>• `password`: `string`, longitud mínima `1`. |
| **`CreateUserSchema`** | [`CreateUserCommandValidator.cs:9-30`](../backend/Zentric.Application/Users/Validators/CreateUserCommandValidator.cs#L9-L30) | • `identityDocument`: `string` recortado, no vacío.<br>• `fullName`: `string` recortado, no vacío.<br>• `email`: `string` recortado, formato de correo válido.<br>• `password`: `string`, longitud mínima `8` y máxima `128` caracteres ([ADR-0009](../backendSDD/Adr/0009-autenticacion-jwt-rg01.md)).<br>• `role`: `z.enum(['Buyer', 'Seller', 'Administrator', 'Supervisor', 'LogisticsOperator'])`. |
| **`CreateWarehouseSchema`** | [`CreateWarehouseCommandValidator.cs:9-31`](../backend/Zentric.Application/Warehouses/Validators/CreateWarehouseCommandValidator.cs#L9-L31) | • `name`: `string` recortado, no vacío.<br>• `location`: `string` recortado, no vacío.<br>• `capacity`: `number` entero $> 0$ ($m^3$).<br>• `type`: `z.enum(['Marketplace', 'Vendor'])` ([`WarehouseType.cs:3-7`](../backend/Zentric.Domain/Warehouses/Enum/WarehouseType.cs#L3-L7)).<br>• `vendorId`: `string` UUID opcional/nulo.<br>• **Refinamiento cruzado:** Si `type === 'Marketplace'`, `vendorId` debe ser `null`/`undefined`; si `type === 'Vendor'`, `vendorId` debe ser un UUID válido no vacío. |
| **`AddStockSchema`** | [`AddStockCommandValidator.cs:8-23`](../backend/Zentric.Application/Inventories/Validators/AddStockCommandValidator.cs#L8-L23) | • `variantId`: `string` UUID válido.<br>• `warehouseId`: `string` UUID válido.<br>• `quantity`: `number` entero $> 0$ (`ZENTRIC.md` Dominio 6: prohibidas existencias negativas). |
| **`AdjustInventorySchema`** | [`AdjustInventoryCommand.cs:23-28`](../backend/Zentric.Application/Inventories/Commands/AdjustInventoryCommand.cs#L23-L28)<br>[`InventoriesController.cs:152`](../backend/Zentric.Api/Controllers/InventoriesController.cs#L152) | • `countedQuantity`: `number` entero $\ge 0$ y $\le$ `availableQuantity` actual ([ADR-0021](../backendSDD/Adr/0021-ajuste-de-stock-sin-cuello-de-botella.md): el conteo físico sólo puede reducir existencias disponibles).<br>• `reason`: `string` recortado, no vacío. |
| **`CreateProductSchema`** | [`CreateProductCommandValidator.cs:9-32`](../backend/Zentric.Application/Catalog/Validators/CreateProductCommandValidator.cs#L9-L32)<br>[`CreateProductCommand.cs:16-41`](../backend/Zentric.Application/Catalog/Commands/CreateProductCommand.cs#L16-L41) | • `name`: `string` recortado, no vacío, máximo `200` caracteres.<br>• `description`: `string` recortado, no vacío, máximo `2000` caracteres.<br>• `priceAmount`: `number` $> 0$.<br>• `priceCurrency`: `string` recortado, longitud exacta de `3` caracteres ISO (`COP`, `USD`).<br>• `type`: `z.enum(['Physical', 'Digital'])`.<br>• `variants`: arreglo de objetos `{ sku: string (1..100), attributes: Array<{ name: string (1..50), value: string (1..50) }> }`.<br>• **Refinamiento cruzado:** Cuando `type === 'Physical'`, `variants.length >= 1` ([ADR-0003](../backendSDD/Adr/0003-variante-obligatoria-productos-fisicos.md)). |
| **`AddCartItemSchema`** | [`AddOrderItemCommandValidator.cs:23-35`](../backend/Zentric.Application/Orders/Validators/AddOrderItemCommandValidator.cs)<br>[`AddOrderItemCommand.cs:703-707`](../backend/Zentric.Application/Orders/Commands/AddOrderItemCommand.cs#L703-L707) | • `orderId`: `string` UUID válido.<br>• `variantId`: `string` UUID válido.<br>• `quantity`: `number` entero $> 0$. |
| **`CreateFulfillmentSchema`** | [`CreateFulfillmentOrderCommandValidator.cs`](../backend/Zentric.Application/Logistics/Validators/CreateFulfillmentOrderCommandValidator.cs) | • `customerOrderId`: `string` UUID válido.<br>• `vendorId`: `string` UUID válido. |
| **`CancelGhostStockSchema`** | [`CancelFulfillmentOrderDueToNoStockCommand.cs:28-34`](../backend/Zentric.Application/Logistics/Commands/CancelFulfillmentOrderDueToNoStockCommand.cs#L28-L34) | • `fulfillmentOrderId`: `string` UUID válido.<br>• `variantId`: `string` UUID válido.<br>• `warehouseId`: `string` UUID válido.<br>• `quantityToCancel`: `number` entero $> 0$. |
| **`RequestReturnSchema`** | [`RequestReturnCommandValidator.cs`](../backend/Zentric.Application/Returns/Validators/RequestReturnCommandValidator.cs)<br>[`RequestReturnCommand.cs:1072`](../backend/Zentric.Application/Returns/Commands/RequestReturnCommand.cs#L1072) | • `customerOrderId`: `string` UUID válido.<br>• `variantId`: `string` UUID válido.<br>• `warehouseId`: `string` UUID válido.<br>• `quantity`: `number` entero $> 0$. |
| **`InspectReturnSchema`** | [`ReturnsController.cs:252`](../backend/Zentric.Api/Controllers/ReturnsController.cs#L252) | • `isGoodCondition`: `boolean` obligatorio. |
| **`AnnulInvoiceSchema`** | [`BillingController.cs:144`](../backend/Zentric.Api/Controllers/BillingController.cs#L144) | • `reason`: `string` recortado, no vacío (motivo obligatorio de anulación de Factura Maestra). |

---

## 5. Reglas Puras de Presentación del Dominio (`domain/rules/presentation.ts`)

Funciones deterministas puras en TypeScript sin efectos secundarios que gobiernan la habilitación de controles en la interfaz:

| Función Pura | Firma Contractual | Regla de Negocio y Fuente Canónica |
|---|---|---|
| **`isOrderModifiable`** | `(status: OrderStatus) => boolean` | Retorna `true` únicamente si `status === 'Cart'`. Un pedido en `PendingPayment`, `Paid`, `Dispatched`, `Delivered` o `Cancelled` no admite adición de ítems (`ZENTRIC.md` Dominio 6 y [`CustomerOrder.cs`](../backend/Zentric.Domain/Orders/CustomerOrder.cs)). |
| **`isOrderPayable`** | `(status: OrderStatus, remainingSeconds: number) => boolean` | Retorna `true` únicamente si `status === 'PendingPayment'` y `remainingSeconds > 0` (ventana atómica de 15 minutos, `ZENTRIC.md` Dominio 7). |
| **`isReturnAllowed`** | `(orderStatus: OrderStatus, productType: ProductType) => boolean` | Retorna `true` únicamente si `orderStatus === 'Delivered'` y `productType === 'Physical'` (`ZENTRIC.md` Dominio 10: prohibidas las devoluciones sobre productos digitales). |
| **`canDeliverFulfillment`** | `(status: FulfillmentStatus, callerRole: UserRole) => boolean` | Retorna `true` únicamente si `status === 'Dispatched'` y `callerRole === 'LogisticsOperator'` ([`AuthorizationPolicies.cs:138-151`](../backend/Zentric.Api/Security/AuthorizationPolicies.cs#L138-L151)). |
| **`canResolveReturnCommercially`** | `(status: ReturnStatus, callerRole: UserRole) => boolean` | Retorna `true` únicamente si `status === 'Requested'` y `callerRole === 'Seller'` ([ADR-0006](../backendSDD/Adr/0006-resolucion-contradiccion-ley-addendum.md)). |
| **`canRefundReturn`** | `(status: ReturnStatus, callerRole: UserRole) => boolean` | Retorna `true` únicamente si `status === 'Approved'` y `callerRole === 'Administrator'` ([`AuthorizationPolicies.cs:213-223`](../backend/Zentric.Api/Security/AuthorizationPolicies.cs#L213-L223)). |

---

## 6. Requisitos Verificables de la Capa de Aplicación (Formato EARS)

- **FR-APP-01:** **Cuando** un formulario invoca una mutación con datos que incumplen el esquema Zod correspondiente, el sistema **deberá** abortar el envío local y proyectar los mensajes de validación en español en $< 16\text{ms}$ sin invocar `ZentricApiPort`.
- **FR-APP-02:** **Cuando** `useCreateProductMutation` finaliza con éxito (`200 OK`), el sistema **deberá** exponer el `productId` y el arreglo `variantIds` retornados en `CreatedProductDto` e invalidar `queryKeys.products.all`.
- **INV-APP-01:** La fábrica `queryKeys` y los hooks de `application/services/` **no deberán** almacenar ni sincronizar tokens de sesión en `localStorage` ni `sessionStorage`.
- **ERR-APP-01:** **Si** cualquier consulta o mutación de TanStack Query recibe un error normalizado con `status === 401`, el sistema **deberá** cancelar reintentos adicionales (`retry: false`), invocar `SessionPort.clear()` y redirigir a `/login`.
