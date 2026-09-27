using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Orders.Entities
{
    public sealed class OrderItem
    {
        public Guid Id { get; init; }
        public Guid CustomerOrderId { get; private set; }
        public Guid VariantId { get; private set; } // SKU from Product

        /// <summary>
        /// Vendedor al momento de la compra (instantanea historica).
        ///
        /// DECISION DEL OWNER (2026-09-27, Q-18): se guarda en la linea del
        /// pedido, no se cruza contra el producto al facturar. Si un producto
        /// cambia de vendedor despues de la venta, la factura debe seguir
        /// reflejando quien lo vendio en ese momento: es lo contablemente
        /// correcto para un registro financiero.
        /// </summary>
        public Guid VendorId { get; private set; }

        public int Quantity { get; private set; }
        public Money UnitPrice { get; private set; }

        public Money TotalPrice => UnitPrice.Multiply(Quantity);

        private OrderItem()
        {
            UnitPrice = null!;
        }

        internal OrderItem(Guid customerOrderId, Guid variantId, Guid vendorId, int quantity, Money unitPrice)
        {
            if (customerOrderId == Guid.Empty)
                throw new ArgumentException("Customer order ID is required.", nameof(customerOrderId));

            if (variantId == Guid.Empty)
                throw new ArgumentException("Variant ID is required.", nameof(variantId));

            if (vendorId == Guid.Empty)
                throw new ArgumentException("Vendor ID is required.", nameof(vendorId));

            if (quantity <= 0)
                throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be greater than zero.");

            ArgumentNullException.ThrowIfNull(unitPrice);

            Id = Guid.NewGuid();
            CustomerOrderId = customerOrderId;
            VariantId = variantId;
            VendorId = vendorId;
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

