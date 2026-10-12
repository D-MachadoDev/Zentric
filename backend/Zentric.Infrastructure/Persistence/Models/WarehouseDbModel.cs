using System;
using Zentric.Domain.Warehouses.Enum;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class WarehouseDbModel
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string Location { get; set; } = null!;
        public int Capacity { get; set; }
        public WarehouseType Type { get; set; }
        public Guid? VendorId { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? DeletedAt { get; set; }
    }
}
