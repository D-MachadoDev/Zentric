using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Orders.Entities
{
    /// <summary>
    /// Registro de entrega de un producto digital (CAT-02).
    /// Se crea cuando el pago es aprobado y el producto no requiere logistica.
    /// </summary>
    public sealed class DigitalDeliveryRecord
    {
        public Guid Id { get; init; }
        public Guid OrderId { get; private set; }
        public Guid OrderItemId { get; private set; }
        public Guid ProductId { get; private set; }
        public Guid VariantId { get; private set; }
        public string ProductName { get; private set; }
        public string VariantSku { get; private set; }
        public DateTime DeliveredAt { get; private set; }
        public string DeliveredBy { get; private set; } = "system";

        private DigitalDeliveryRecord()
        {
            ProductName = null!;
            VariantSku = null!;
        }

        public DigitalDeliveryRecord(
            Guid orderId,
            Guid orderItemId,
            Guid productId,
            Guid variantId,
            string productName,
            string variantSku)
        {
            if (orderId == Guid.Empty)
                throw new ArgumentException("Order ID is required.", nameof(orderId));

            if (orderItemId == Guid.Empty)
                throw new ArgumentException("Order item ID is required.", nameof(orderItemId));

            if (productId == Guid.Empty)
                throw new ArgumentException("Product ID is required.", nameof(productId));

            if (variantId == Guid.Empty)
                throw new ArgumentException("Variant ID is required.", nameof(variantId));

            if (string.IsNullOrWhiteSpace(productName))
                throw new ArgumentException("Product name is required.", nameof(productName));

            if (string.IsNullOrWhiteSpace(variantSku))
                throw new ArgumentException("Variant SKU is required.", nameof(variantSku));

            Id = Guid.NewGuid();
            OrderId = orderId;
            OrderItemId = orderItemId;
            ProductId = productId;
            VariantId = variantId;
            ProductName = productName.Trim();
            VariantSku = variantSku.Trim();
            DeliveredAt = DateTime.UtcNow;
        }
    }
}