using System;
using Zentric.Domain.Billing.Enums;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class InvoiceDbModel
    {
        public Guid Id { get; set; }
        public Guid CustomerOrderId { get; set; }
        public InvoiceType Type { get; set; }

        /// <summary>
        /// Vendedor al que corresponde la factura. Es null en la factura maestra
        /// y en el detalle de la plataforma. Q-18: sin esta columna no se puede
        /// saber a quien pertenece cada factura de vendedor.
        /// </summary>
        public Guid? VendorId { get; set; }

        public MoneyDbModel TotalAmount { get; set; } = null!;
        public DateTime IssuedAt { get; set; }
    }
}
