using Zentric.Domain.Returns.Enums;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Common.Models;
using Zentric.Domain.Returns.Events;

namespace Zentric.Domain.Returns
{
    public sealed class ReturnRequest : Entity
    {
        public Guid Id { get; init; }
        public Guid CustomerOrderId { get; private set; }
        public Guid VariantId { get; private set; }
        public Guid WarehouseId { get; private set; }
        public int Quantity { get; private set; }
        public ReturnStatus Status { get; private set; }
        public bool IsGoodCondition { get; private set; }
        public bool VendorApproved { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }

        private ReturnRequest() { }

        public ReturnRequest(Guid customerOrderId, Guid variantId, Guid warehouseId, int quantity, ProductType productType)
        {
            if (productType == ProductType.Digital)
            {
                throw new InvalidOperationException("Los productos digitales no se pueden devolver.");
            }

            if (customerOrderId == Guid.Empty) throw new ArgumentException("El identificador de pedido es obligatorio.", nameof(customerOrderId));
            if (variantId == Guid.Empty) throw new ArgumentException("El identificador de variante es obligatorio.", nameof(variantId));
            if (warehouseId == Guid.Empty) throw new ArgumentException("El identificador de bodega es obligatorio.", nameof(warehouseId));
            if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity), "La cantidad debe ser mayor a cero.");

            Id = Guid.NewGuid();
            CustomerOrderId = customerOrderId;
            VariantId = variantId;
            WarehouseId = warehouseId;
            Quantity = quantity;
            Status = ReturnStatus.Requested;
            IsGoodCondition = false;
            VendorApproved = false;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
        }

        public void InspectByLogistics(bool isGoodCondition)
        {
            if (Status != ReturnStatus.Requested)
                throw new InvalidOperationException("Solo las devoluciones solicitadas pueden ser inspeccionadas.");

            IsGoodCondition = isGoodCondition;
            UpdatedAt = DateTime.UtcNow;
        }

        public void ApproveByVendor(bool isSameWarehouseAndVendor)
        {
            if (Status != ReturnStatus.Requested)
                throw new InvalidOperationException("Solo las devoluciones solicitadas pueden ser aprobadas.");

            if (!isSameWarehouseAndVendor && !IsGoodCondition)
                throw new InvalidOperationException("Con logística separada, no se puede aprobar una devolución si el artículo no ha sido inspeccionado en buen estado.");

            VendorApproved = true;
            Status = ReturnStatus.Approved;
            UpdatedAt = DateTime.UtcNow;
            
            AddDomainEvent(new ReturnApprovedEvent(Id, VariantId, WarehouseId, Quantity));
        }

        public void Reject()
        {
            if (Status != ReturnStatus.Requested)
                throw new InvalidOperationException("Solo las devoluciones solicitadas pueden ser rechazadas.");

            Status = ReturnStatus.Rejected;
            UpdatedAt = DateTime.UtcNow;
        }

        public void MarkAsRefunded()
        {
            if (Status != ReturnStatus.Approved)
                throw new InvalidOperationException("La devolución debe estar aprobada antes del reembolso.");

            Status = ReturnStatus.Refunded;
            UpdatedAt = DateTime.UtcNow;
        }
    }
}

