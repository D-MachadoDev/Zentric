namespace Zentric.Domain.Logistics.Entities
{
    public sealed class Shipment
    {
        public Guid Id { get; init; }
        public Guid FulfillmentOrderId { get; private set; }
        public Guid WarehouseId { get; private set; }
        public string TrackingNumber { get; private set; }
        
        private Shipment()
        {
            TrackingNumber = null!;
        }

        internal Shipment(Guid fulfillmentOrderId, Guid warehouseId, string trackingNumber)
        {
            if (fulfillmentOrderId == Guid.Empty)
                throw new ArgumentException("FulfillmentOrderId required", nameof(fulfillmentOrderId));
            if (warehouseId == Guid.Empty)
                throw new ArgumentException("WarehouseId required", nameof(warehouseId));
            
            Id = Guid.NewGuid();
            FulfillmentOrderId = fulfillmentOrderId;
            WarehouseId = warehouseId;
            TrackingNumber = trackingNumber;
        }
    }
}

