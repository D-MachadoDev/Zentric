using System;
using Zentric.Domain.Common.Models;

namespace Zentric.Domain.Users
{
    /// <summary>
    /// Solicitud y registro de dispersión de fondos para un vendedor.
    /// </summary>
    public sealed class SellerPayout : Entity
    {
        public Guid Id { get; init; } = Guid.NewGuid();
        public Guid SellerId { get; private set; }
        public decimal Amount { get; private set; }
        public string Currency { get; private set; }
        public string Status { get; private set; }
        public string BankSummary { get; private set; }
        public string ReferenceNumber { get; private set; }
        public DateTime RequestedAt { get; private set; }
        public DateTime? ProcessedAt { get; private set; }

        private SellerPayout()
        {
            Currency = "COP";
            Status = "Pending";
            BankSummary = null!;
            ReferenceNumber = null!;
        }

        public SellerPayout(
            Guid sellerId,
            decimal amount,
            string bankSummary,
            string? referenceNumber = null,
            string currency = "COP",
            Guid? id = null)
        {
            if (sellerId == Guid.Empty)
                throw new ArgumentException("El identificador de vendedor no puede estar vacío.", nameof(sellerId));

            if (amount <= 0)
                throw new ArgumentException("El monto a retirar debe ser mayor a cero.", nameof(amount));

            if (string.IsNullOrWhiteSpace(bankSummary))
                throw new ArgumentException("El resumen bancario es obligatorio.", nameof(bankSummary));

            Id = id ?? Guid.NewGuid();
            SellerId = sellerId;
            Amount = amount;
            Currency = string.IsNullOrWhiteSpace(currency) ? "COP" : currency.Trim().ToUpperInvariant();
            Status = "Pending";
            BankSummary = bankSummary.Trim();
            ReferenceNumber = referenceNumber ?? $"RET-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpperInvariant()}";
            RequestedAt = DateTime.UtcNow;
            ProcessedAt = null;
        }

        public void MarkAsCompleted()
        {
            Status = "Completed";
            ProcessedAt = DateTime.UtcNow;
        }

        public void MarkAsRejected()
        {
            Status = "Rejected";
            ProcessedAt = DateTime.UtcNow;
        }
    }
}
