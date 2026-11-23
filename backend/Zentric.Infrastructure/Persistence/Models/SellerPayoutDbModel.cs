using System;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class SellerPayoutDbModel
    {
        public Guid Id { get; set; }
        public Guid SellerId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "COP";
        public string Status { get; set; } = "Pending";
        public string BankSummary { get; set; } = null!;
        public string ReferenceNumber { get; set; } = null!;
        public DateTime RequestedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
    }
}
