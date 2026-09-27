using System;
using Zentric.Domain.Payments.Enums;

namespace Zentric.Infrastructure.Persistence.Models
{
    /// <summary>
    /// Modelo de persistencia del comprobante de pago. No guarda datos de tarjeta
    /// ni de billetera: solo el resultado del cobro (invariante 9).
    /// </summary>
    public class PaymentReceiptDbModel
    {
        public Guid Id { get; set; }
        public Guid OrderId { get; set; }
        public PaymentStatus Status { get; set; }
        public MoneyDbModel Amount { get; set; } = null!;
        public MoneyDbModel RefundedAmount { get; set; } = null!;
        public string? TransactionId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? RefundedAt { get; set; }
    }
}