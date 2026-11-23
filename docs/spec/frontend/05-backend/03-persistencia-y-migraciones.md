# Backend — Persistencia y Migraciones — Zentric (PostgreSQL + EF Core 10)

## 1. Principios
- **Schema-first**: Migraciones EF Core versionadas en `Zentric.Infrastructure/Migrations`.
- **Convenciones**: Snake_case para tablas/columnas (`customer_orders`, `variant_id`). PK = `id` (UUID). FK = `{table}_id`.
- **Soft delete global**: Columna `deleted_at` (timestamptz) + `is_deleted` (bool) en todas las entidades. Global query filter `WHERE deleted_at IS NULL`.
- **Auditoría**: `created_at`, `updated_at` en todas. `created_by`, `updated_by` (FK a users) en entidades sensibles.
- **Índices**: PK + FK automáticos. Índices compuestos por patrones de query frecuentes (ver sección 3).
- **Concurrencia**: `xmin` (system column) o `row_version` (bytea) para optimistic locking en agregados críticos (`Inventory`, `CustomerOrder`).

## 2. Tablas principales (resumen)

| Tabla | Entidad | PK | FKs clave | Índices compuestos sugeridos |
|-------|---------|----|-----------|------------------------------|
| `users` | User | `id` | — | `email` (unique), `role`, `status` |
| `buyers` | Buyer | `id` (=user_id) | `user_id` | — |
| `warehouses` | Warehouse | `id` | `vendor_id` (nullable) | `type`, `is_active`, `vendor_id` |
| `products` | Product | `id` | `vendor_id` | `vendor_id`, `status`, `type`, `category` |
| `product_variants` | ProductVariant | `id` | `product_id` | `product_id`, `sku` (unique), `is_active` |
| `variant_attributes` | VariantAttribute | `id` | `variant_id` | `variant_id`, `name` |
| `customer_orders` | CustomerOrder | `id` | `buyer_id` | `buyer_id`, `status`, `created_at`, `checkout_started_at` |
| `order_items` | OrderItem | `id` | `order_id`, `variant_id`, `vendor_id` | `order_id`, `variant_id`, `vendor_id` |
| `fulfillment_orders` | FulfillmentOrder | `id` | `order_id`, `vendor_id`, `warehouse_id`, `carrier_id` | `order_id`, `vendor_id`, `warehouse_id`, `status` |
| `shipments` | Shipment | `id` | `fulfillment_order_id`, `carrier_id` | `fulfillment_order_id`, `tracking_number` |
| `inventories` | Inventory | `id` | `variant_id`, `warehouse_id` | **Unique**: `(variant_id, warehouse_id)`, `variant_id`, `warehouse_id` |
| `invoices` | Invoice | `id` | `order_id` | `order_id`, `type`, `status`, `issued_at` |
| `return_requests` | ReturnRequest | `id` | `order_id`, `vendor_id`, `variant_id` | `order_id`, `vendor_id`, `status`, `created_at` |
| `refund_credits` | RefundCredit | `id` | `return_request_id` | `return_request_id`, `status` |
## 3. Detalles por agregado crítico

### 3.1 Inventory (clave compuesta + concurrencia)
```sql
CREATE TABLE inventories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id uuid NOT NULL REFERENCES product_variants(id),
    warehouse_id uuid NOT NULL REFERENCES warehouses(id),
    available_quantity int NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    reserved_quantity int NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    used_quantity int NOT NULL DEFAULT 0 CHECK (used_quantity >= 0),
    damaged_quantity int NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT uq_inventory_variant_warehouse UNIQUE (variant_id, warehouse_id)
);
CREATE INDEX ix_inventories_variant ON inventories(variant_id);
CREATE INDEX ix_inventories_warehouse ON inventories(warehouse_id);
```
- **Concurrencia**: `UPDATE inventories SET available_quantity = available_quantity + @qty, updated_at = now() WHERE variant_id = @v AND warehouse_id = @w AND available_quantity + @qty >= 0` (conditional update atómico, ADR-0025).

### 3.2 CustomerOrder (estados + transiciones)
```sql
CREATE TABLE customer_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id uuid NOT NULL REFERENCES buyers(id),
    status varchar(20) NOT NULL CHECK (status IN ('Cart','PendingPayment','Paid','Dispatched','Delivered','Cancelled')),
    cancellation_cause varchar(30) CHECK (cancellation_cause IN ('Expired','PaymentFailed','StockBreak','BuyerRequested','FullyResolved')),
    cancellation_reason text,
    checkout_started_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);
CREATE INDEX ix_orders_buyer ON customer_orders(buyer_id);
CREATE INDEX ix_orders_status ON customer_orders(status);
CREATE INDEX ix_orders_checkout ON customer_orders(checkout_started_at) WHERE status = 'PendingPayment';
```

### 3.3 FulfillmentOrder (subdivisión por vendor+warehouse)
```sql
CREATE TABLE fulfillment_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES customer_orders(id),
    vendor_id uuid NOT NULL REFERENCES sellers(id),
    warehouse_id uuid NOT NULL REFERENCES warehouses(id),
    carrier_id uuid REFERENCES carriers(id),
    tracking_number varchar(100),
    status varchar(20) NOT NULL CHECK (status IN ('PendingPacking','Packed','Dispatched','Delivered','Cancelled')),
    cancellation_cause varchar(30),
    packed_at timestamptz,
    dispatched_at timestamptz,
    delivered_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);
CREATE INDEX ix_fulfillment_order ON fulfillment_orders(order_id);
CREATE INDEX ix_fulfillment_vendor ON fulfillment_orders(vendor_id);
CREATE INDEX ix_fulfillment_warehouse ON fulfillment_orders(warehouse_id);
CREATE INDEX ix_fulfillment_status ON fulfillment_orders(status);
```

### 3.4 Invoices (split 3 documentos)
```sql
CREATE TABLE invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES customer_orders(id),
    type varchar(20) NOT NULL CHECK (type IN ('Master','ZentricDetail','Vendor')),
    status varchar(20) NOT NULL CHECK (status IN ('Draft','Issued','Voided')),
    amount_cents bigint NOT NULL,
    currency varchar(3) NOT NULL DEFAULT 'COP',
    tax_amount_cents bigint NOT NULL DEFAULT 0,
    issued_at timestamptz,
    voided_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
## 4. Migraciones y despliegue
- **Naming**: `YYYYMMDDHHMMSS_DescripcionPascalCase.cs` (ej. `20261025120000_AddInventoryConditionalUpdate.cs`).
- **Idempotencia**: Migraciones son transaccionales (PG). `dotnet ef database update` en pipeline CI/CD.
- **Rollback**: `dotnet ef database update <PreviousMigration>`. Cada migración debe tener `Down()` probado.
- **Seeding**: Solo datos de referencia (roles, carriers, categorías base) en migración `*_SeedReferenceData`. No datos de prueba.

## 5. Testing de persistencia
- **Testcontainers** (PostgreSQL efímero) en `Zentric.Tests.Integration`.
- **Fixtures**: `DatabaseFixture` comparte instancia por test class. `Respawn` para limpieza entre tests.
- **Assertions**: Verificar constraints (CHECK, UNIQUE, FK), indexes, query plans (`EXPLAIN ANALYZE`) para queries críticas.

## 6. Decisiones ABIERTAS (requieren ADR)
- Uso de `pg_partman` vs. manual.
- Read replicas para reportes (Supervisor/Admin).
- Full-text search en productos (pg_trgm / tsvector) vs. Elasticsearch/Meilisearch.
- Backup/Point-in-time recovery policy (RPO/RTO).
);
CREATE INDEX ix_invoices_order ON invoices(order_id);
CREATE INDEX ix_invoices_type ON invoices(type);
```
| `payment_receipts` | PaymentReceipt | `id` | `order_id` | `order_id`, `status`, `external_reference` |
| `idempotency_keys` | IdempotencyKey | `key` | — | `expires_at` (TTL index) |
| `audit_logs` | AuditLog | `id` | `actor_id`, `resource_type`, `resource_id` | `actor_id`, `resource_type`, `resource_id`, `created_at` |
| `carriers` | Carrier | `id` | — | `is_active` |
