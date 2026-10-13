# 02. Objetos de Valor y Enumeraciones (Value Objects & Enums) — Zentric

> **Especificación Táctica de Conceptos Inmutables.** Define rigurosamente todos los Objetos de Valor (*Value Objects*) y Enumeradores (*Enums*) del dominio de **Zentric** (`Zentric.Domain`), conforme a los principios tácticos de Domain-Driven Design (DDD).

---

## 1. Principios de Diseño de Value Objects en Zentric

En Zentric, los Value Objects encarnan conceptos del negocio que carecen de identidad propia y siguen cuatro leyes inviolables:

1. **Inmutabilidad Estricta:** Una vez instanciado, un Value Object jamás muta su estado. Cualquier operación que altere un valor debe retornar una **nueva instancia** (ej. `money.Add(other)`).
2. **Igualdad por Valor:** Dos objetos de valor son idénticos si todos sus atributos son iguales (`IEquatable<T>`), sin importar su dirección de memoria ni identificadores.
3. **Auto-validación Defensiva:** Un Value Object no puede existir en memoria en un estado corrupto o inválido; el constructor valida formatos, rangos y listas blancas inmediatamente.
4. **Cero Dependencia Técnica:** No implementan clases base pesadas de ORMs ni dependen de persistencia; son estructuras C# puras (`record` o `sealed class` con semántica de valor).

---

## 2. Matriz Maestra de Value Objects del Dominio

| Value Object | Subdominio de Origen | Atributos Encapsulados | Reglas e Invariantes Críticas | Comportamientos de Negocio |
| :--- | :--- | :--- | :--- | :--- |
| **`Money`** | `Catalog` / `Ordering` / `Billing` | `Amount` (`decimal`), `Currency` (`string`) | Monto redondeado a 2 decimales (`MidpointRounding.AwayFromZero`). Moneda normalizada en mayúsculas de 3 letras (ISO 4217). **Lista blanca estricta:** actualmente solo `COP` habilitada. Prohibidos importes negativos. | `Add(Money)`, `Subtract(Money)`, `Multiply(int)`. Operar monedas distintas lanza `MixedCurrencyException`. |
| **`Address`** | `Buyers` | `Street`, `City`, `State`, `ZipCode`, `Country` | Los 5 campos son obligatorios y sin espacios en blanco residuales. Representa la dirección física de despacho del comprador. | Igualdad estructural completa. |
| **`Email`** | `Identity` | `Value` (`string`) | Normalizado en minúsculas. Mínimo 5 caracteres, exactamente un carácter `@`, y dominio con punto (`.`). | Igualdad insensible a mayúsculas/minúsculas. |
| **`FullName`** | `Identity` | `FirstName` (`string`), `LastName` (`string`), `Value` (`string`) | Nombres y apellidos sin números, entre 2 y 80 caracteres. Formateado automático con mayúscula inicial y minúsculas restantes. | `ToString()` retorna `"Nombre Apellido"`. |
| **`VariantAttribute`** | `Catalog` | `Name` (`string`), `Value` (`string`) | Par descriptivo inmutable de la variante vendible (ej. `"Talla" = "M"`, `"Color" = "Negro"`). Texto no vacío, máximo 50 caracteres por campo. | Formato canónico: `"Name=Value"`. |
| **`StockAdjustmentRecord`** | `Inventory` | `SystemQuantity`, `PhysicalQuantity`, `CountedBy`, `Reason`, `CountedAt` | Registro inmutable de auditoría para conteos físicos en bodega. No puede ser alterado ni editado una vez creado. | Historial inmutable en `Inventory`. |

---

## 3. Decisión Normativa sobre Identificadores (IDs Planos vs. Fuertemente Tipados)

- **Estándar Oficial:** En Zentric, todas las entidades y agregados emplean **`Guid` plano** como identificador primario y foráneo.
- **Justificación de Arquitectura:** El uso de tipos envoltorios (`record struct UserId(Guid Value)`) fue evaluado y descartado por introducir sobrecostos de conversión en DTOs, mappers de EF Core y serializadores JSON sin aportar beneficios funcionales proporcionales frente a las validaciones defensivas de constructores y pruebas unitarias.

---

## 4. Matriz Maestra de Enumeraciones y Catálogos (Enums)

Todas las enumeraciones en Zentric se serializan en contratos externos (JSON / HTTP REST) estrictamente por **su nombre literal en cadena** (*String Enum Converter*), quedando prohibido el uso de enteros ordinales para evitar roturas por reordenamiento.

### 4.1. Catálogos de Identidad y Roles

| Enumerador | Espacio de Nombres | Valores Admitidos | Significado y Regla de Negocio |
| :--- | :--- | :--- | :--- |
| **`UserRole`** | `Zentric.Domain.Users.Enums` | `Buyer`<br/>`Seller`<br/>`Administrator`<br/>`Supervisor`<br/>`LogisticsOperator` | Rol único asignado al usuario. Dicta los permisos en las políticas de seguridad de la API. |
| **`UserStatus`** | `Zentric.Domain.Users.Enums` | `Active`<br/>`Blocked`<br/>`Deleted` | Condición operativa. `Blocked` inhabilita autenticación y compras. `Deleted` representa borrado lógico (*soft delete*). |

---

### 4.2. Catálogos de Catálogo e Inventario

| Enumerador | Espacio de Nombres | Valores Admitidos | Significado y Regla de Negocio |
| :--- | :--- | :--- | :--- |
| **`ProductType`** | `Zentric.Domain.Products.Enums` | `Physical`<br/>`Digital` | Define la ruta operativa: `Physical` exige inventario y despacho; `Digital` genera entrega digital inmediata tras pago y prohíbe devoluciones. |
| **`ProductStatus`** | `Zentric.Domain.Products.Enums` | `Published`<br/>`Suspended`<br/>`Discontinued` | Ciclo comercial del producto: `Published` (vendible), `Suspended` (pausado temporalmente), `Discontinued` (retirado definitivamente). |
| **`WarehouseType`** | `Zentric.Domain.Warehouses.Enum` | `Marketplace`<br/>`Vendor` | `Marketplace` (bodega central compartida de Zentric); `Vendor` (bodega privada con `VendorId` obligatorio). |

---

### 4.3. Catálogos de Pedidos y Logística

| Enumerador | Espacio de Nombres | Valores Admitidos | Significado y Regla de Negocio |
| :--- | :--- | :--- | :--- |
| **`OrderStatus`** | `Zentric.Domain.Orders.Enums` | `Cart`<br/>`PendingPayment`<br/>`Paid`<br/>`Dispatched`<br/>`Delivered`<br/>`Cancelled` | Ciclo de vida del pedido maestro. `Cart` admite modificaciones; `Paid` sella el pedido como inmodificable; `Cancelled` libera reservas. |
| **`OrderCancellationCause`** | `Zentric.Domain.Orders.Enums` | `PaymentTimeout`<br/>`FullyResolved` | Motivo estructurado de anulación: `PaymentTimeout` (expiró la ventana de 15 min); `FullyResolved` (todos los paquetes cancelados por quiebre y dinero reembolsado). |
| **`FulfillmentStatus`** | `Zentric.Domain.Logistics.Enums` | `PendingPackaging`<br/>`Packed`<br/>`Dispatched`<br/>`Delivered`<br/>`Cancelled` | Ciclo del paquete por vendedor: `PendingPackaging` (alistamiento), `Packed` (caja lista), `Dispatched` (en camión), `Delivered` (entregado), `Cancelled` (quiebre de stock fantasma). |

---

### 4.4. Catálogos Financieros, Facturación y Posventa

| Enumerador | Espacio de Nombres | Valores Admitidos | Significado y Regla de Negocio |
| :--- | :--- | :--- | :--- |
| **`PaymentStatus`** | `Zentric.Domain.Payments.Enums` | `Pending`<br/>`Approved`<br/>`Declined`<br/>`Refunded` | Estado financiero del cobro con la pasarela. `Refunded` solo se alcanza si el monto reembolsado iguala el total cobrado. |
| **`InvoiceType`** | `Zentric.Domain.Billing.Enums` | `Master`<br/>`ZentricDetail`<br/>`VendorDetail` | Tipología fiscal: `Master` (entregada al comprador), `ZentricDetail` (comisión interna confidencial del 5%), `VendorDetail` (liquidación neta del vendedor al 95%). |
| **`InvoiceStatus`** | `Zentric.Domain.Billing.Enums` | `Issued`<br/>`Anulled` | Estado contable de la factura: `Issued` (emitida válidamente), `Anulled` (anulada por contracargo o error administrativo). |
| **`ReturnStatus`** | `Zentric.Domain.Returns.Enums` | `Requested`<br/>`Approved`<br/>`Rejected`<br/>`Refunded` | Ciclo de la devolución: requiere peritaje favorable de logística (`Inspect`) y visto bueno comercial del vendedor (`ApproveByVendor`). |
| **`RefundDecisionType`**| `Zentric.Domain.Returns` | `Automatic`<br/>`Manual` | Origen de la decisión de reembolso: `Automatic` (regla del sistema por quiebre de stock); `Manual` (excepción autorizada por Administrador). |
| **`RefundAuditOutcome`** | `Zentric.Domain.Returns` | `Credited`<br/>`InsufficientBalance`<br/>`VariantNotOnOrder`<br/>`NoReceipt`<br/>`Unauthorized`<br/>`Error` | Resultado técnico registrado en la auditoría inmutable de reembolsos (`RefundAudit`). |