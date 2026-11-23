using System;

namespace Zentric.Infrastructure.Persistence.Models
{
    // Stores idempotency keys to replay cached responses for duplicate POST/PATCH requests.
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