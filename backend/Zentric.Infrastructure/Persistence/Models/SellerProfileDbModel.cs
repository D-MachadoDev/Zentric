using System;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class SellerProfileDbModel
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string StoreName { get; set; } = null!;
        public string? LogoUrl { get; set; }
        public bool IsVerified { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
