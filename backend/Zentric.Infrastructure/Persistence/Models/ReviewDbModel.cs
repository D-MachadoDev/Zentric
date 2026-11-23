using System;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class ReviewDbModel
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public Guid UserId { get; set; }
        public string? BuyerName { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public string? ImageUrlsJson { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public ProductDbModel Product { get; set; } = null!;
    }
}
