using Zentric.Domain.Logistics.Entities;
using Zentric.Domain.Logistics.Enums;

namespace Zentric.Domain.Logistics
{
    public sealed class FulfillmentOrder : Zentric.Domain.Common.Models.Entity
    {
        public Guid Id { get; init; }
        public Guid CustomerOrderId { get; private set; }
        public Guid VendorId { get; private set; }
        public FulfillmentStatus Status { get; private set; }
        public string? CancellationReason { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }

        private readonly List<Shipment> _shipments = new();
        public IReadOnlyCollection<Shipment> Shipments => _shipments.AsReadOnly();

        private FulfillmentOrder()
        {
        }

        public FulfillmentOrder(Guid customerOrderId, Guid vendorId)
        {
            if (customerOrderId == Guid.Empty)
                throw new ArgumentException("El identificador de pedido es obligatorio.", nameof(customerOrderId));

            if (vendorId == Guid.Empty)
                throw new ArgumentException("El identificador de vendedor es obligatorio.", nameof(vendorId));

            Id = Guid.NewGuid();
            CustomerOrderId = customerOrderId;
            VendorId = vendorId;
            Status = FulfillmentStatus.PendingPack; // Nace en Pendiente de Empaque
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
        }

        public void AddShipment(Guid warehouseId, string trackingNumber)
        {
            if (Status == FulfillmentStatus.Cancelled)
                throw new InvalidOperationException("No se pueden agregar envíos a un pedido cancelado.");

            _shipments.Add(new Shipment(Id, warehouseId, trackingNumber));
            UpdatedAt = DateTime.UtcNow;
        }

        public void Pack()
        {
            if (Status == FulfillmentStatus.Cancelled)
                throw new InvalidOperationException("No se puede empacar un pedido cancelado.");

            if (Status != FulfillmentStatus.PendingPack)
                throw new InvalidOperationException("El pedido debe estar en estado PendingPack para ser empacado.");

            Status = FulfillmentStatus.Packed;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Dispatch()
        {
            if (Status == FulfillmentStatus.Cancelled)
                throw new InvalidOperationException("No se puede despachar un pedido cancelado.");

            if (Status != FulfillmentStatus.Packed)
                throw new InvalidOperationException("El pedido debe estar empacado antes de ser despachado.");

            Status = FulfillmentStatus.Dispatched;
            UpdatedAt = DateTime.UtcNow;

            foreach (var shipment in _shipments)
            {
                AddDomainEvent(new Zentric.Domain.Logistics.Events.PhysicalProductShippedDomainEvent(shipment.Id, Id));
            }
        }
        
        public void Deliver()
        {
            if (Status != FulfillmentStatus.Dispatched)
                throw new InvalidOperationException("El pedido debe estar despachado antes de ser entregado.");
                
            Status = FulfillmentStatus.Delivered;
            UpdatedAt = DateTime.UtcNow;
        }

        public void CancelDueToNoStock()
        {
            if (Status == FulfillmentStatus.Dispatched || Status == FulfillmentStatus.Delivered)
                throw new InvalidOperationException("No se puede cancelar un pedido despachado o entregado por stock fantasma.");

            Status = FulfillmentStatus.Cancelled;
            CancellationReason = "Stock Fantasma";
            UpdatedAt = DateTime.UtcNow;
            
            AddDomainEvent(new Zentric.Domain.Logistics.Events.PartialFulfillmentCancelledDomainEvent(Id, CancellationReason));
        }
    }
}
