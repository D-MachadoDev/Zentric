using System;
using Zentric.Domain.Payments.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Payments
{
    /// <summary>
    /// Raiz de agregado que representa un intento de pago de un pedido.
    /// Referencia: backendSDD/Domain/ (Pagos) y Q-08.
    /// </summary>
    public sealed class Payment
    {
        public Guid Id { get; private set; }
        public Guid OrderId { get; private set; }
        public Money Amount { get; private set; }
        public PaymentStatus Status { get; private set; }
        public string? TransactionId { get; private set; }
        public DateTime CreatedAt { get; private set; }

        private Payment()
        {
            Amount = null!;
        }

        /// <summary>Crea un pago pendiente. El importe debe ser positivo.</summary>
        public static Payment Create(Guid orderId, Money amount)
        {
            if (amount is null) throw new ArgumentNullException(nameof(amount));
            if (amount.Amount <= 0m)
            {
                throw new ArgumentException("Payment amount must be positive.", nameof(amount));
            }

            return new Payment
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                Amount = amount,
                Status = PaymentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Marca el pago como aprobado. Idempotente: un pago ya aprobado conserva
        /// su transaccion y no se vuelve a marcar, para que un reintento de la
        /// pasarela no cambie el historico.
        /// </summary>
        public void Approve(string transactionId)
        {
            if (string.IsNullOrWhiteSpace(transactionId))
            {
                throw new ArgumentException("Transaction id is required.", nameof(transactionId));
            }

            if (Status == PaymentStatus.Approved) return;

            Status = PaymentStatus.Approved;
            TransactionId = transactionId;
        }

        /// <summary>Marca el pago como rechazado. Un pago aprobado nunca se rechaza.</summary>
        public void Decline(string reason)
        {
            if (Status == PaymentStatus.Approved) return;

            Status = PaymentStatus.Declined;
        }
    }
}