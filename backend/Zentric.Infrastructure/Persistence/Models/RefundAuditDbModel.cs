using System;
using Zentric.Domain.Returns;
using Zentric.Domain.Users.Enums;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class RefundAuditDbModel
    {
        public Guid Id { get; set; }
        public Guid ReturnRequestId { get; set; }
        public Guid CustomerOrderId { get; set; }
        public Guid? OrderLineId { get; set; }
        public Guid PaymentReceiptId { get; set; }
        public string RuleApplied { get; set; } = null!;
        public RefundDecisionType DecisionType { get; set; }
        public Guid? ActorId { get; set; }
        public UserRole? ActorRole { get; set; }
        public RefundAuditOutcome Outcome { get; set; }
        public string? ErrorMessage { get; set; }
        public decimal AttemptedAmount { get; set; }
        public string Currency { get; set; } = null!;
        public DateTime OccurredAt { get; set; }
    }
}