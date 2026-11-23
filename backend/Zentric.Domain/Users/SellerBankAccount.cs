using System;
using Zentric.Domain.Common.Models;

namespace Zentric.Domain.Users
{
    /// <summary>
    /// Cuenta bancaria de depósito para dispersión de pagos de un vendedor registrado en el marketplace.
    /// Invariante de persistencia: existe máximo una cuenta activa por vendedor.
    /// </summary>
    public sealed class SellerBankAccount : Entity
    {
        public Guid Id { get; init; } = Guid.NewGuid();
        public Guid SellerId { get; private set; }
        public string BankName { get; private set; }
        public string AccountType { get; private set; }
        public string AccountNumber { get; private set; }
        public string AccountHolderName { get; private set; }
        public string DocumentNumber { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }

        private SellerBankAccount()
        {
            BankName = null!;
            AccountType = null!;
            AccountNumber = null!;
            AccountHolderName = null!;
            DocumentNumber = null!;
        }

        public SellerBankAccount(
            Guid sellerId,
            string bankName,
            string accountType,
            string accountNumber,
            string accountHolderName,
            string documentNumber,
            Guid? id = null)
        {
            if (sellerId == Guid.Empty)
                throw new ArgumentException("El identificador de vendedor no puede estar vacío.", nameof(sellerId));

            if (string.IsNullOrWhiteSpace(bankName))
                throw new ArgumentException("El nombre del banco es obligatorio.", nameof(bankName));

            if (string.IsNullOrWhiteSpace(accountType))
                throw new ArgumentException("El tipo de cuenta es obligatorio.", nameof(accountType));

            if (string.IsNullOrWhiteSpace(accountNumber))
                throw new ArgumentException("El número de cuenta es obligatorio.", nameof(accountNumber));

            if (string.IsNullOrWhiteSpace(accountHolderName))
                throw new ArgumentException("El nombre del titular es obligatorio.", nameof(accountHolderName));

            if (string.IsNullOrWhiteSpace(documentNumber))
                throw new ArgumentException("El documento del titular es obligatorio.", nameof(documentNumber));

            Id = id ?? Guid.NewGuid();
            SellerId = sellerId;
            BankName = bankName.Trim();
            AccountType = accountType.Trim();
            AccountNumber = accountNumber.Trim();
            AccountHolderName = accountHolderName.Trim();
            DocumentNumber = documentNumber.Trim();
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
        }

        public void Update(
            string bankName,
            string accountType,
            string accountNumber,
            string accountHolderName,
            string documentNumber)
        {
            if (string.IsNullOrWhiteSpace(bankName))
                throw new ArgumentException("El nombre del banco es obligatorio.", nameof(bankName));

            if (string.IsNullOrWhiteSpace(accountType))
                throw new ArgumentException("El tipo de cuenta es obligatorio.", nameof(accountType));

            if (string.IsNullOrWhiteSpace(accountNumber))
                throw new ArgumentException("El número de cuenta es obligatorio.", nameof(accountNumber));

            if (string.IsNullOrWhiteSpace(accountHolderName))
                throw new ArgumentException("El nombre del titular es obligatorio.", nameof(accountHolderName));

            if (string.IsNullOrWhiteSpace(documentNumber))
                throw new ArgumentException("El documento del titular es obligatorio.", nameof(documentNumber));

            BankName = bankName.Trim();
            AccountType = accountType.Trim();
            AccountNumber = accountNumber.Trim();
            AccountHolderName = accountHolderName.Trim();
            DocumentNumber = documentNumber.Trim();
            UpdatedAt = DateTime.UtcNow;
        }
    }
}
