# 05. Puertos (Ports)

Siguiendo el principio de **Inversión de Dependencias** y la **Arquitectura Hexagonal**, este documento define los Puertos de Salida (Output Ports) requeridos por el Dominio para consultar o persistir datos. Las implementaciones reales residirán en `Zentric.Infrastructure`.

## 1. Puertos de Repositorios (Persistencia)

- **`IUserRepository`**: Abstracción para leer/escribir perfiles. Esencial para validar la unicidad del correo electrónico y el documento de identidad.
- **`IProductRepository`**: Acceso al catálogo.
- **`IWarehouseRepository`**: Acceso a la configuración y ubicación de bodegas (Marketplace vs. Vendor).
- **`IInventoryRepository`**: Extremadamente crítico. Debe soportar manejo de concurrencia y bloqueo optimista para evitar fallos matemáticos al invocar `Reserve()` y `Release()`. Opera con la clave `(VariantId, WarehouseId)` ([ADR-0002](../Adr/0002-clave-inventario-variantid.md)).
- **`ICustomerOrderRepository`**: Administra la persistencia del pedido maestro transaccional unificado.
- **`IFulfillmentOrderRepository`**: Administra el ciclo de vida de los despachos individuales generados para los vendedores.

## 2. Puertos de Mensajería (Event Bus)

- **`IDomainEventDispatcher`**: Interfaz utilizada internamente por los agregados y repositorios para publicar los eventos de dominio en memoria (ej. `OrderPaidDomainEvent`), permitiendo que los *Handlers* correspondientes reaccionen.

## 3. Puertos Externos Conceptuales

*Estos servicios suelen ser Puertos de Aplicación, pero el dominio define las interfaces para inyectar su lógica en el flujo:*
- **`IInvoicingService`**: Para emitir la factura centralizada desde Zentric hacia el Comprador final.
- **`IPaymentGatewayService`**: Para validar las confirmaciones de las pasarelas externas.
