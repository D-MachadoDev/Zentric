using System;

namespace Zentric.Infrastructure.Persistence.Models
{
    // Tracks every data change for compliance and traceability.
    public class AuditLogDbModel
    {
        public Guid Id { get; set; }
        public string EntityName { get; set; } = null!;
        public string EntityId { get; set; } = null!;
        public string Action { get; set; } = null!;
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public Guid? ActorId { get; set; }
        public DateTime OccurredAt { get; set; }
    }
}