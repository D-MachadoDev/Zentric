# Capa de Aplicación - Casos de Uso y Puertos

Este documento detalla los comandos (CQRS) y puertos que definen los casos de uso para ZENTRIC.md.

## 1. Patrón Arquitectónico
Se utiliza **CQRS** (Command Query Responsibility Segregation) con la librería `MediatR`. Todo caso de uso se define como un `IRequest<Result<T>>` o `IRequest<Result>`.
Las validaciones de entrada se realizan con `FluentValidation` en el Pipeline de MediatR (`ValidationBehavior<TRequest, TResponse>`), antes de que el Command toque el Dominio.

## 2. Puertos de Salida (Output Ports)
Siguiendo la Arquitectura Hexagonal estricta (AGENTS.md, sección 2.1), las interfaces de persistencia de agregados residen en sus respectivos módulos de Dominio (`Zentric.Domain/*/Ports/`) y son consumidas por los Handlers de Aplicación:
- `IUserRepository`, `IBuyerRepository`, `IProductRepository`, `IWarehouseRepository`, `IInventoryRepository`, `ICustomerOrderRepository`, `IFulfillmentOrderRepository`, `IReturnRequestRepository`, `IInvoiceRepository`.
- Puerto de transacción y persistencia: `IUnitOfWork` (`Zentric.Application.Common.Ports.IUnitOfWork`).

---

## 3. Catálogo Completo de Casos de Uso (Commands)

### 3.1. Módulo de Usuarios (`Zentric.Application.Users`)
- **`CreateUserCommand`**: Registra usuarios con roles (Buyer, Seller, LogisticsOperator, Admin, Supervisor). Valida unicidad de correo y documento de identidad.
  - *Validador:* `CreateUserCommandValidator`.

### 3.2. Módulo de Bodegas (`Zentric.Application.Warehouses`)
- **`CreateWarehouseCommand`**: Registra bodegas Marketplace (sin vendor) o Vendor (con vendor obligatorio).
  - *Validador:* `CreateWarehouseCommandValidator`.

### 3.3. Módulo de Inventario (`Zentric.Application.Inventories`)
- **`AddStockCommand`**: Registra o incrementa existencias disponibles de una variante (SKU) en una bodega específica.
  - *Validador:* `AddStockCommandValidator`.

### 3.4. Módulo de Catálogo (`Zentric.Application.Catalog`)
- **`CreateProductCommand`**: Crea productos físicos (con variantes obligatorias) o digitales.
  - *Validador:* `CreateProductCommandValidator`.
- **`PublishProductCommand`**: Publica un producto para comercialización pública.
  - *Validador:* `PublishProductCommandValidator`.

### 3.5. Módulo de Pedidos (`Zentric.Application.Orders`)
- **`CreateCartCommand`**: Inicializa un `CustomerOrder` en estado `Cart`.
  - *Validador:* `CreateCartCommandValidator`.
- **`AddOrderItemCommand`**: Añade ítems al carrito validando cantidad y precio.
  - *Validador:* `AddOrderItemCommandValidator`.
- **`CheckoutOrderCommand`**: Pasa el pedido de `Cart` a `PendingPayment`, reservando stock a través de `InventoryReservationService` y generando los `FulfillmentOrder` por vendedor.
  - *Validador:* `CheckoutOrderCommandValidator`.
- **`PayOrderCommand`**: Valida y confirma la transacción de pago, pasando el pedido de `PendingPayment` a `Paid` y disparando `OrderPaidDomainEvent`.
  - *Validador:* `PayOrderCommandValidator`.

### 3.6. Módulo de Logística (`Zentric.Application.Logistics`)
- **`CreateFulfillmentOrderCommand`**: Genera un despacho individual por vendedor.
  - *Validador:* `CreateFulfillmentOrderCommandValidator`.
- **`DispatchFulfillmentCommand`**: Marca como despachado (`Shipped`) y despacha físicamente el inventario.
  - *Validador:* `DispatchFulfillmentCommandValidator`.
- **`CancelFulfillmentOrderDueToNoStockCommand`**: Cancela unilateralmente por quiebre de stock, reconcilia inventario a 0 (`ReconcileGhostStock`) y detona solicitud obligatoria de devolución/reembolso.
  - *Validador:* `CancelFulfillmentOrderDueToNoStockCommandValidator`.

### 3.7. Módulo de Devoluciones (`Zentric.Application.Returns`)
- **`RequestReturnCommand`**: Crea la solicitud inicial (`Requested`), prohibiendo devoluciones en productos digitales.
  - *Validador:* `RequestReturnCommandValidator`.
- **`InspectReturnCommand`**: Registra inspección física de condición (`IsGoodCondition`) por el operador logístico.
  - *Validador:* `InspectReturnCommandValidator`.
- **`ApproveReturnCommand`**: Aprobación comercial final del vendedor, reintegrando las unidades al inventario como Usadas (`ReturnToUsedStock`).
  - *Validador:* `ApproveReturnCommandValidator`.

### 3.8. Módulo de Facturación (`Zentric.Application.Billing`)
- **`GenerateInvoicesCommand`**: Dado un `CustomerOrderId` pagado, genera:
  1. `InvoiceType.Master` (Factura Maestra consolidada para el comprador).
  2. `InvoiceType.ZentricDetail` (Tarifa de servicio de la plataforma Zentric).
  3. `InvoiceType.VendorDetail` (Factura de desglose / split para cada vendedor).

---

## 4. Catálogo Completo de Consultas (Queries CQRS)

En cumplimiento de `ZENTRIC.md` OBJ-12 ("Consolidar información administrativa para consulta") y el rol del Supervisor, las siguientes consultas idempotentes de lectura proyectan datos sin mutar el estado del dominio:

### 4.1. Consultas de Usuarios (`Zentric.Application.Users.Queries`)
- **`GetUsersQuery(UserRole? Role)`**: Retorna la lista de usuarios del sistema con filtro opcional por rol (`Vendor`, `Buyer`, `Administrator`, `Supervisor`, `LogisticsOperator`). Proyecta `UserDto`.
- **`GetUserByIdQuery(Guid Id)`**: Retorna la ficha técnica de un usuario por su identificador único.

### 4.2. Consultas de Bodegas (`Zentric.Application.Warehouses.Queries`)
- **`GetWarehousesQuery(Guid? VendorId)`**: Lista todas las bodegas activas con filtro opcional por vendedor (`VendorId`). Proyecta `WarehouseDto`.
- **`GetWarehouseByIdQuery(Guid Id)`**: Retorna el detalle de una bodega por su ID.

### 4.3. Consultas de Catálogo (`Zentric.Application.Catalog.Queries`)
- **`GetProductsQuery(Guid? VendorId)`**: Lista los productos del catálogo con sus variantes vendibles y filtro opcional por vendedor. Proyecta `ProductDto`.
- **`GetProductByIdQuery(Guid Id)`**: Retorna el detalle completo de un producto con sus dimensiones y variantes.

### 4.4. Consultas de Inventario (`Zentric.Application.Inventories.Queries`)
- **`GetInventoryByVariantQuery(Guid VariantId)`**: Retorna las existencias físicas distribuidas por bodega (disponible, reservado, usado, dañado) para una variante. Proyecta `InventoryDto`.

### 4.5. Consultas de Órdenes (`Zentric.Application.Orders.Queries`)
- **`GetOrderByIdQuery(Guid OrderId)`**: Retorna el estado del pedido (`Cart`, `PendingPayment`, `Paid`), total e ítems asociados. Proyecta `OrderDto`.

### 4.6. Consultas de Logística (`Zentric.Application.Logistics.Queries`)
- **`GetFulfillmentByIdQuery(Guid Id)`**: Retorna el estado del paquete de fulfillment, vendedor y números de guía (`TrackingNumber`). Proyecta `FulfillmentOrderDto`.

### 4.7. Consultas de Devoluciones (`Zentric.Application.Returns.Queries`)
- **`GetReturnByIdQuery(Guid Id)`**: Retorna el estado de la solicitud de devolución y el dictamen de inspección física. Proyecta `ReturnRequestDto`.

### 4.8. Consultas de Facturación (`Zentric.Application.Billing.Queries`)
- **`GetInvoicesByOrderQuery(Guid OrderId)`**: Retorna la lista de facturas emitidas para un pedido (Factura Maestra y Detalle Zentric). Proyecta `InvoiceDto`.

---

## 5. Pipeline de Validación y Resiliencia
- `ValidationBehavior<TRequest, TResponse>` intercepta todas las llamadas a MediatR antes de invocar el handler. Si hay errores de validación, retorna `Result.Failure` con el desglose RFC 9457 sin arrojar excepciones no controladas.

