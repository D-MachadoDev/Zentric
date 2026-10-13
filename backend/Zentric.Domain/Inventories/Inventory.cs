namespace Zentric.Domain.Inventories
{
    using System;
    using System.Collections.Generic;
    using Zentric.Domain.Common.Models;
    using Zentric.Domain.Inventories.Events;

    // Registro de auditoria de un ajuste por conteo fisico (ADR-0021). Inmutable:
    // un registro que se pudiera editar no serviria para auditar reincidentes.
    public sealed record StockAdjustmentRecord(
        int SystemQuantity,
        int PhysicalQuantity,
        Guid CountedBy,
        string Reason,
        DateTime CountedAt);

    /// <summary>
    /// Agregado raíz que controla las existencias físicas y reservas de un SKU en una bodega determinada.
    /// </summary>
    /// <remarks>
    /// ZENTRIC.md Dominio 6 y ADR-0002: El inventario se particiona por variante (SKU) y bodega (WarehouseId).
    /// Protege la invariante de existencias no negativas (INV-01) y separa el disponible real del stock comprometido en carritos/pedidos.
    /// </remarks>
    public sealed class Inventory : Entity
    {
        public Guid Id { get; init; }

        // VariantId (SKU): clave del inventario segun ADR-0002. Cada variante de un
        // producto tiene su propio control de stock por bodega.
        public Guid VariantId { get; private set; }
        public Guid WarehouseId { get; private set; }
        public int AvailableQuantity { get; private set; }
        public int ReservedQuantity { get; private set; }
        public int DamagedQuantity { get; private set; }
        public int UsedQuantity { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }
        public DateTime? DeletedAt { get; private set; }
        // Historial de ajustes por conteo fisico (ADR-0021, decision 5: actor,
        // motivo escrito, fecha, siempre). Privado y perezoso: la fila puede
        // reconstruirse sin constructor (ver Entity.cs) y el inicializador no
        // correria. Solo crece por ApplyPhysicalCount.
        private List<StockAdjustmentRecord>? _adjustments;
        private List<StockAdjustmentRecord> AdjustmentsStore => _adjustments ??= new();
        public IReadOnlyCollection<StockAdjustmentRecord> AdjustmentHistory => AdjustmentsStore.AsReadOnly();
        // Soft delete: la fila sigue existiendo para el historico (pedidos que la
        // consumieron), pero deja de contar como existencia disponible.
        public bool IsDeleted => DeletedAt.HasValue;

        /// <summary>
        /// Constructor protegido para hidratación de persistencia sin ejecutar validaciones de creación.
        /// </summary>
        private Inventory()
        {
        }
        
        public Inventory(Guid variantId, Guid warehouseId, int availableQuantity, int reservedQuantity, int damagedQuantity, int usedQuantity = 0)
        {
            if (variantId == Guid.Empty)
            {
                throw new ArgumentException("VariantId is required.", nameof(variantId));
            }

            if (warehouseId == Guid.Empty)
            {
                throw new ArgumentException("WarehouseId is required.", nameof(warehouseId));
            }

            if (availableQuantity < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(availableQuantity), "Available quantity cannot be negative.");
            }

            if (reservedQuantity < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(reservedQuantity), "Reserved quantity cannot be negative.");
            }

            if (damagedQuantity < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(damagedQuantity), "Damaged quantity cannot be negative.");
            }

            Id = Guid.NewGuid();
            VariantId = variantId;
            WarehouseId = warehouseId;
            this.AvailableQuantity = availableQuantity;
            ReservedQuantity = reservedQuantity;
            DamagedQuantity = damagedQuantity;
            UsedQuantity = usedQuantity;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
        }

        /// <summary>
        /// Incrementa el stock disponible tras una recepción física confirmada de mercancía del vendedor.
        /// </summary>
        public void AddStock(int quantity)
        {
            if (quantity <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity to add must be greater than zero.");
            }

            AvailableQuantity += quantity;
            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Bloquea temporalmente unidades disponibles para un carrito o pedido en curso.
        /// </summary>
        /// <remarks>
        /// Invariante INV-01: No permite sobreventa. Las unidades pasan a <see cref="ReservedQuantity"/>
        /// impidiendo que otros compradores adquieran el mismo producto simultáneamente.
        /// </remarks>
        public void ReserveStock(int quantity)
        {
            if (quantity <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity to reserve must be greater than zero.");
            }

            if (AvailableQuantity < quantity)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "Not enough available stock to reserve.");
            }

            AvailableQuantity -= quantity;
            ReservedQuantity += quantity;
            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Liquida unidades reservadas cuando la orden es empaquetada y entregada a la transportadora.
        /// </summary>
        /// <remarks>
        /// Las unidades abandonan físicamente la bodega, reduciendo el inventario reservado del sistema.
        /// </remarks>
        public void DispatchStock(int quantity)
        {
            if (quantity <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity to dispatch must be greater than zero.");
            }

            if (ReservedQuantity < quantity)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "Not enough reserved stock to dispatch.");
            }

            ReservedQuantity -= quantity;
            UpdatedAt = DateTime.UtcNow;
        }

        public void MarkAsDamaged(int quantity)
        {
            if (quantity <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity to mark as damaged must be greater than zero.");
            }

            if (AvailableQuantity < quantity)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "Not enough available stock to mark as damaged.");
            }

            AvailableQuantity -= quantity;
            DamagedQuantity += quantity;
            UpdatedAt = DateTime.UtcNow;
        }

        public void ReturnToAvailable(int quantity)
        {
            // INV-01 / invariante 1 (backendSDD/Domain/06-business-rules.md, sección 1,
            // backendSDD/Domain/04-invariants-and-rules.md, sección 1): AvailableQuantity nunca puede
            // ser negativo. Sin esta guarda, una cantidad no positiva (p. ej. -100)
            // reducia AvailableQuantity por debajo de cero. Correccion T-003 (H-08).
            if (quantity <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity to return must be greater than zero.");
            }

            if (ReservedQuantity < quantity)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "Not enough reserved stock to return.");
            }

            ReservedQuantity -= quantity;
            AvailableQuantity += quantity;
            UpdatedAt = DateTime.UtcNow;
        }

        
        public void ReturnToUsedStock(int quantity)
        {
            if (quantity <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be greater than zero.");
            }
            UsedQuantity += quantity;
            UpdatedAt = DateTime.UtcNow;
        }

        public void ReconcileGhostStock(int ghostQuantity)
        {
            if (ghostQuantity <= 0)
                throw new ArgumentOutOfRangeException(nameof(ghostQuantity), "Ghost quantity must be greater than zero.");

            if (ReservedQuantity < ghostQuantity)
                throw new InvalidOperationException("Cannot reconcile more ghost stock than is reserved.");

            ReservedQuantity -= ghostQuantity;
            
            // Regla de negocio: Si hubo quiebre por stock fantasma, debemos asegurar 
            // que AvailableQuantity quede en 0 para que no vuelva a pasar.
            if (AvailableQuantity > 0)
            {
                AvailableQuantity = 0;
            }
            UpdatedAt = DateTime.UtcNow;
        }

        public void ReceiveReturnedStock(int quantity)
        {
            if (quantity <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity to receive must be greater than zero.");
            }
            AvailableQuantity += quantity;
            UpdatedAt = DateTime.UtcNow;
        }

        public void ApplyPhysicalCount(int countedQuantity, Guid countedBy, string reason)
        {
            // Ajuste a la baja con evidencia (ADR-0021): un conteo fisico del
            // Operador Logistico corrige el disponible sin autorizacion previa.
            if (countedQuantity < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(countedQuantity), "Counted quantity cannot be negative.");
            }

            if (countedBy == Guid.Empty)
            {
                throw new ArgumentException("Counter identity is required.", nameof(countedBy));
            }

            if (string.IsNullOrWhiteSpace(reason))
            {
                throw new ArgumentException("Adjustment reason is required.", nameof(reason));
            }

            // Al alza no hay ajuste: es el Ingreso normal del Vendedor (ADR-0021,
            // decision 3). Un conteo no puede inventar stock.
            if (countedQuantity > AvailableQuantity)
            {
                throw new InvalidOperationException("A physical count cannot add stock. Upward corrections are a vendor Ingreso, not an adjustment.");
            }

            // Sin diferencia no hay ajuste ni registro: el historial audita
            // ajustes, no conteos que confirman.
            if (countedQuantity == AvailableQuantity)
            {
                return;
            }

            var record = new StockAdjustmentRecord(
                SystemQuantity: AvailableQuantity,
                PhysicalQuantity: countedQuantity,
                CountedBy: countedBy,
                Reason: reason,
                CountedAt: DateTime.UtcNow);

            AvailableQuantity = countedQuantity;
            AdjustmentsStore.Add(record);
            UpdatedAt = record.CountedAt;
            AddDomainEvent(new StockAdjustedDomainEvent(Id, record.SystemQuantity, record.PhysicalQuantity, countedBy, reason));
        }

        // Reconstruccion del historial desde persistencia. No valida ni muta
        // contadores: el ajuste ya se aplico cuando se registro. Solo la usa
        // el mapper; el negocio entra por ApplyPhysicalCount.
        public void RestoreAdjustment(StockAdjustmentRecord record)
        {
            AdjustmentsStore.Add(record);
        }

        public void MarkAsDeleted()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Inventory is already deleted.");
            }

            if (AvailableQuantity > 0 || ReservedQuantity > 0 || DamagedQuantity > 0)
            {
                throw new InvalidOperationException("No puedes eliminar un inventario que aún tiene existencias físicas. Debes transferirlas, ajustarlas a cero o despacharlas primero.");
            }

            DeletedAt = DateTime.UtcNow;
            UpdatedAt = DeletedAt.Value;
        }

    }
    
}





