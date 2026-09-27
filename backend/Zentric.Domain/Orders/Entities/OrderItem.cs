using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Orders.Entities
{
    public sealed class OrderItem
    {
        public Guid Id { get; init; }
        public Guid CustomerOrderId { get; private set; }
        public Guid VariantId { get; private set; } // SKU from Product
        public int Quantity { get; private set; }
        public Money UnitPrice { get; private set; }

        public Money TotalPrice => UnitPrice.Multiply(Quantity);

        private OrderItem()
        {
            UnitPrice = null!;
        }

        internal OrderItem(Guid customerOrderId, Guid variantId, int quantity, Money unitPrice)
        {
            if (customerOrderId == Guid.Empty)
                throw new ArgumentException("Customer order ID is required.", nameof(customerOrderId));
                
            if (variantId == Guid.Empty)
                throw new ArgumentException("Variant ID is required.", nameof(variantId));
                
            if (quantity <= 0)
                throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be greater than zero.");
                
            ArgumentNullException.ThrowIfNull(unitPrice);

            Id = Guid.NewGuid();
            CustomerOrderId = customerOrderId;
            VariantId = variantId;
            Quantity = quantity;
            UnitPrice = unitPrice;
        }

        internal void AddQuantity(int additionalQuantity)
        {
            if (additionalQuantity <= 0)
                throw new ArgumentOutOfRangeException(nameof(additionalQuantity), "Additional quantity must be greater than zero.");

            Quantity += additionalQuantity;
        }

        internal void UpdateQuantity(int newQuantity)
        {
            if (newQuantity <= 0)
                throw new ArgumentOutOfRangeException(nameof(newQuantity), "Quantity must be greater than zero.");

            Quantity = newQuantity;
        }
    }
}

