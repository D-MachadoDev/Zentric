using System;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class BuyerDbModel
    {
        public Guid UserId { get; set; }
        public string MainAddress { get; set; } = null!;
        public bool IsActiveForCommerce { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
