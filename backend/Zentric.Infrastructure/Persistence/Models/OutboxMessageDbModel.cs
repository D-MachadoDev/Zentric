using System;

namespace Zentric.Infrastructure.Persistence.Models
{
    // Stores domain events that need to be published reliably.
    // The OutboxProcessor picks them up and dispatches them.
    public class OutboxMessageDbModel
    {
        public Guid Id { get; set; }
        public string EventType { get; set; } = null!;
        public string Payload { get; set; } = null!;
        public DateTime OccurredAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public int RetryCount { get; set; }
        public string? LastError { get; set; }
    }
}