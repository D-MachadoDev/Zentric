using Zentric.Domain.Billing.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Billing
{
    public sealed class Invoice
    {
        public Guid Id { get; init; }
        public Guid CustomerOrderId { get; private set; }
        public Guid? VendorId { get; private set; } // Null if it's the Master invoice
        public InvoiceType Type { get; private set; }
        public Money TotalAmount { get; private set; }
        public DateTime IssuedAt { get; private set; }

        private Invoice() { TotalAmount = null!; }

        // Factura Maestra para el cliente (Comprador)
        public static Invoice CreateMaster(Guid customerOrderId, Money totalAmount)
        {
            ArgumentNullException.ThrowIfNull(totalAmount);
            if (customerOrderId == Guid.Empty) throw new ArgumentException("Order ID is required.");

            return new Invoice
            {
                Id = Guid.NewGuid(),
                CustomerOrderId = customerOrderId,
                VendorId = null,
                Type = InvoiceType.Master,
                TotalAmount = totalAmount,
                IssuedAt = DateTime.UtcNow
            };
        }

        // Factura detalle/split para el vendedor específico
        public static Invoice CreateVendorDetail(Guid customerOrderId, Guid vendorId, Money vendorTotalAmount)
        {
            ArgumentNullException.ThrowIfNull(vendorTotalAmount);
            if (customerOrderId == Guid.Empty) throw new ArgumentException("Order ID is required.");
            if (vendorId == Guid.Empty) throw new ArgumentException("Vendor ID is required.");

            return new Invoice
            {
                Id = Guid.NewGuid(),
                CustomerOrderId = customerOrderId,
                VendorId = vendorId,
                Type = InvoiceType.VendorDetail,
                TotalAmount = vendorTotalAmount,
                IssuedAt = DateTime.UtcNow
            };
        }

        // Factura detalle para la plataforma Zentric (Comisiones/Fees)
        public static Invoice CreateZentricDetail(Guid customerOrderId, Money zentricFeeAmount)
        {
            ArgumentNullException.ThrowIfNull(zentricFeeAmount);
            if (customerOrderId == Guid.Empty) throw new ArgumentException("Order ID is required.");

            return new Invoice
            {
                Id = Guid.NewGuid(),
                CustomerOrderId = customerOrderId,
                VendorId = null,
                Type = InvoiceType.ZentricDetail,
                TotalAmount = zentricFeeAmount,
                IssuedAt = DateTime.UtcNow
            };
        }
    }
}

