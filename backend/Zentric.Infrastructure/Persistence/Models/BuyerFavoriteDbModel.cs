using System;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class BuyerFavoriteDbModel
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid ProductId { get; set; }
        public DateTime CreatedAt { get; set; }

        public ProductDbModel? Product { get; set; }
    }
}
