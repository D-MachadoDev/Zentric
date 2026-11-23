namespace Zentric.Domain.Inventories
{
    using System;
    using System.Collections.Generic;
    using Zentric.Domain.Common.Models;
    using Zentric.Domain.Inventories.Events;

    // Registro de auditoria de un ajuste por conteo fisico. Inmutable:
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
    /// ZENTRIC.md Dominio 6 y ADEl inventario se particiona por variante (SKU) y bodega (WarehouseId).
    /// Protege la invariante de existencias no negativas y separa el disponible real del stock comprometido en carritos/pedidos.
    /// </remarks>
    public sealed class Inventory : Entity
    {
        public Guid Id { get; init; }

        // VariantId (SKU): clave del inventario. Cada variante de un
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
        // Historial de ajustes por conteo fisico (actor,
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
                throw new ArgumentException("El identificador de variante es obligatorio.", nameof(variantId));
            }

            if (warehouseId == Guid.Empty)
            {
                throw new ArgumentException("El identificador de bodega es obligatorio.", nameof(warehouseId));
            }

            if (availableQuantity < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(availableQuantity), "La cantidad disponible no puede ser negativa.");
            }

            if (reservedQuantity < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(reservedQuantity), "La cantidad reservada no puede ser negativa.");
            }

            if (damagedQuantity < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(damagedQuantity), "La cantidad dañada no puede ser negativa.");
            }

            if (usedQuantity < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(usedQuantity), "La cantidad usada no puede ser negativa.");
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
                throw new ArgumentOutOfRangeException(nameof(quantity), "La cantidad a agregar debe ser mayor a cero.");
            }

            AvailableQuantity += quantity;
            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Bloquea temporalmente unidades disponibles para un carrito o pedido en curso.
        /// </summary>
        /// <remarks>
        /// No permite sobreventa. Las unidades pasan a <see cref="ReservedQuantity"/>
        /// impidiendo que otros compradores adquieran el mismo producto simultáneamente.
        /// </remarks>
        public void ReserveStock(int quantity)
        {
            if (quantity <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "La cantidad a reservar debe ser mayor a cero.");
            }

            if (AvailableQuantity < quantity)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "No hay suficiente stock disponible para reservar.");
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
                throw new ArgumentOutOfRangeException(nameof(quantity), "La cantidad a despachar debe ser mayor a cero.");
            }

            if (ReservedQuantity < quantity)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "No hay suficiente stock reservado para despachar.");
            }

            ReservedQuantity -= quantity;
            UpdatedAt = DateTime.UtcNow;
        }

        public void MarkAsDamaged(int quantity)
        {
            if (quantity <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "La cantidad a marcar como dañada debe ser mayor a cero.");
            }

            if (AvailableQuantity < quantity)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "No hay suficiente stock disponible para marcar como dañado.");
            }

            AvailableQuantity -= quantity;
            DamagedQuantity += quantity;
            UpdatedAt = DateTime.UtcNow;
        }

        public void ReturnToAvailable(int quantity)
        {
            // Invariante: AvailableQuantity nunca puede ser negativo.
            // Sin esta validación, una cantidad no positiva (p. ej. -100)
            // reducía AvailableQuantity por debajo de cero.
            if (quantity <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "La cantidad a devolver debe ser mayor a cero.");
            }

            if (ReservedQuantity < quantity)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "No hay suficiente stock reservado para devolver.");
            }

            ReservedQuantity -= quantity;
            AvailableQuantity += quantity;
            UpdatedAt = DateTime.UtcNow;
        }

        
        public void ReturnToUsedStock(int quantity)
        {
            if (quantity <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "La cantidad debe ser mayor a cero.");
            }
            UsedQuantity += quantity;
            UpdatedAt = DateTime.UtcNow;
        }

        public void ReconcileGhostStock(int ghostQuantity)
        {
            if (ghostQuantity <= 0)
                throw new ArgumentOutOfRangeException(nameof(ghostQuantity), "La cantidad fantasma debe ser mayor a cero.");

            if (ReservedQuantity < ghostQuantity)
                throw new InvalidOperationException("No se puede conciliar más stock fantasma del que está reservado.");

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
                throw new ArgumentOutOfRangeException(nameof(quantity), "La cantidad a recibir debe ser mayor a cero.");
            }
            AvailableQuantity += quantity;
            UpdatedAt = DateTime.UtcNow;
        }

        public void ApplyPhysicalCount(int countedQuantity, Guid countedBy, string reason)
        {
            // Ajuste a la baja con evidencia: un conteo fisico del
            // Operador Logistico corrige el disponible sin autorizacion previa.
            if (countedQuantity < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(countedQuantity), "La cantidad contada no puede ser negativa.");
            }

            if (countedBy == Guid.Empty)
            {
                throw new ArgumentException("La identidad del contador es obligatoria.", nameof(countedBy));
            }

            if (string.IsNullOrWhiteSpace(reason))
            {
                throw new ArgumentException("El motivo del ajuste es obligatorio.", nameof(reason));
            }

            // Al alza no hay ajuste: es el Ingreso normal del Vendedor (
            // decision 3). Un conteo no puede inventar stock.
            if (countedQuantity > AvailableQuantity)
            {
                throw new InvalidOperationException("Un conteo físico no puede agregar stock. Las correcciones al alza son un Ingreso del vendedor, no un ajuste.");
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
                throw new InvalidOperationException("El inventario ya está eliminado.");
            }

            if (AvailableQuantity > 0 || ReservedQuantity > 0 || DamagedQuantity > 0 || UsedQuantity > 0)
            {
                throw new InvalidOperationException("No puedes eliminar un inventario que aún tiene existencias físicas. Debes transferirlas, ajustarlas a cero o despacharlas primero.");
            }

            DeletedAt = DateTime.UtcNow;
            UpdatedAt = DeletedAt.Value;
        }

    }
    
}





