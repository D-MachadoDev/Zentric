using System;
using Zentric.Domain.Billing.Enums;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class InvoiceDbModel
    {
        public Guid Id { get; set; }
        public Guid CustomerOrderId { get; set; }
        public InvoiceType Type { get; set; }
        public MoneyDbModel TotalAmount { get; set; } = null!;
        public DateTime IssuedAt { get; set; }
    }
}
