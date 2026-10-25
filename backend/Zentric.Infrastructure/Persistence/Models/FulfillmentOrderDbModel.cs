using System;
using System.Collections.Generic;
using Zentric.Domain.Logistics.Enums;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class FulfillmentOrderDbModel
    {
        public Guid Id { get; set; }
        public Guid CustomerOrderId { get; set; }
        public Guid VendorId { get; set; }
        public FulfillmentStatus Status { get; set; }
        public string? CancellationReason { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public ICollection<ShipmentDbModel> Shipments { get; set; } = new List<ShipmentDbModel>();
    }

    public class ShipmentDbModel
    {
        public Guid Id { get; set; }
        public Guid FulfillmentOrderId { get; set; }
        public Guid WarehouseId { get; set; }
        public string TrackingNumber { get; set; } = null!;
        public FulfillmentOrderDbModel FulfillmentOrder { get; set; } = null!;
    }
}
