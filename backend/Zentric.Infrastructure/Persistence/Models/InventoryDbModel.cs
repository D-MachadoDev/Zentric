using System;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class InventoryDbModel
    {
        public Guid Id { get; set; }
        public Guid VariantId { get; set; }
        public Guid WarehouseId { get; set; }
        public int AvailableQuantity { get; set; }
        public int ReservedQuantity { get; set; }
        public int DamagedQuantity { get; set; }
        public int UsedQuantity { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
