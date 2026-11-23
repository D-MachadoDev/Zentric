using System;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class SellerBankAccountDbModel
    {
        public Guid Id { get; set; }
        public Guid SellerId { get; set; }
        public string BankName { get; set; } = null!;
        public string AccountType { get; set; } = null!;
        public string AccountNumber { get; set; } = null!;
        public string AccountHolderName { get; set; } = null!;
        public string DocumentNumber { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
