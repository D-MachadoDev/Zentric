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

        /// <summary>
        /// Un registro por cada credito a favor (ADR-0020 decision 7). La
        /// navegacion existe para que EF inserte las filas nuevas en la misma
        /// transaccion que el comprobante: sin ella la traza viviria solo en
        /// memoria y se perderia al salir del proceso.
        /// </summary>
        public List<RefundCreditDbModel> Credits { get; set; } = new();
    }
}