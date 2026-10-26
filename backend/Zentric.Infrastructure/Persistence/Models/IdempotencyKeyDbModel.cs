using System;

namespace Zentric.Infrastructure.Persistence.Models
{
    // Stores idempotency keys so duplicate POST/PATCH requests
    // return the cached response instead of re-running the operation.
    public class IdempotencyKeyDbModel
    {
        public Guid Id { get; set; }
        public string Key { get; set; } = null!;
        public string RequestPath { get; set; } = null!;
        public string RequestMethod { get; set; } = null!;
        public int ResponseStatusCode { get; set; }
        public string? ResponseBody { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}