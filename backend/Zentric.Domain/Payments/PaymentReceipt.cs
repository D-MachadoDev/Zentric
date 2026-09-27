using System;
using Zentric.Domain.Payments.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Payments
{
    /// <summary>
    /// Raiz de agregado que representa el comprobante de un cobro.
    ///
    /// Invariante 9 (backendSDD/Domain/04-invariants-and-rules.md): el dominio
    /// avanza de estado con un simple comprobante que valida el exito o el fallo
    /// de la pasarela. NO se almacenan tarjetas de credito ni billeteras; este
    /// agregado guarda unicamente el resultado del cobro.
    ///
    /// Referencia: backendSDD/Domain/04-invariants-and-rules.md, invariante 9.
    /// </summary>
    public sealed class PaymentReceipt
    {
        public Guid Id { get; private set; }
        public Guid OrderId { get; private set; }
        public Money Amount { get; private set; }
        public PaymentStatus Status { get; private set; }
        public string? TransactionId { get; private set; }

        /// <summary>
        /// Monto acreditado como credito a favor del comprador. Es cero mientras
        /// el comprobante no haya sido saldado por una devolucion.
        /// </summary>
        public Money RefundedAmount { get; private set; }

        public DateTime CreatedAt { get; private set; }
        public DateTime? RefundedAt { get; private set; }

        private PaymentReceipt()
        {
            Amount = null!;
            RefundedAmount = new Money(0m, "COP");
        }

        /// <summary>Crea un comprobante pendiente. El importe debe ser positivo.</summary>
        public static PaymentReceipt Create(Guid orderId, Money amount)
        {
            if (amount is null) throw new ArgumentNullException(nameof(amount));
            if (amount.Amount <= 0m)
            {
                throw new ArgumentException("Payment amount must be positive.", nameof(amount));
            }

            return new PaymentReceipt
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                Amount = amount,
                RefundedAmount = new Money(0m, amount.Currency),
                Status = PaymentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Marca el comprobante como aprobado. Idempotente: un comprobante ya
        /// aprobado conserva su transaccion y no se vuelve a marcar, para que un
        /// reintento de la pasarela no cambie el historico.
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

        /// <summary>
        /// Marca el comprobante como rechazado. Un comprobante aprobado nunca
        /// se rechaza.
        /// </summary>
        public void Decline()
        {
            if (Status == PaymentStatus.Approved) return;

            Status = PaymentStatus.Declined;
        }

        /// <summary>
        /// Salda el comprobante con un credito a favor del comprador.
        ///
        /// ADDENDUM - DICTADO POR OWNER (2026-09-27): el reembolso se
        /// materializa como credito a favor dentro de la plataforma, porque el
        /// sistema no custodia dinero. El pedido NO se revierte: ya fue
        /// entregado y facturado, y reabrirlo obligaria a deshacer logistica y
        /// facturacion cerradas.
        ///
        /// Idempotente: un comprobante ya reembolsado conserva su credito.
        /// </summary>
        public void Refund(Money creditAmount)
        {
            if (creditAmount is null) throw new ArgumentNullException(nameof(creditAmount));

            // Idempotencia primero: un comprobante ya reembolsado conserva su
            // credito y no vuelve a validarse. Sin esta guarda, el estado
            // Refunded haria fallar la validacion de "aprobado" de mas abajo.
            if (Status == PaymentStatus.Refunded) return;

            // Solo un comprobante efectivamente cobrado puede acreditarse.
            if (Status != PaymentStatus.Approved)
            {
                throw new InvalidOperationException(
                    "Only an approved payment receipt can be refunded.");
            }

            if (creditAmount.Currency != Amount.Currency)
            {
                throw new InvalidOperationException(
                    $"Refund currency {creditAmount.Currency} does not match receipt currency {Amount.Currency}.");
            }

            if (creditAmount.Amount <= 0m || creditAmount.Amount > Amount.Amount)
            {
                throw new ArgumentException(
                    "Refund must be greater than zero and cannot exceed the receipt amount.", nameof(creditAmount));
            }

            Status = PaymentStatus.Refunded;
            RefundedAmount = creditAmount;
            RefundedAt = DateTime.UtcNow;
        }
    }
}