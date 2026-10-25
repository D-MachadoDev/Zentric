using System;
using Zentric.Domain.Returns.Enums;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class ReturnRequestDbModel
    {
        public Guid Id { get; set; }
        public Guid CustomerOrderId { get; set; }
        public Guid VariantId { get; set; }
        public Guid WarehouseId { get; set; }
        public int Quantity { get; set; }
        public ReturnStatus Status { get; set; }
        public bool IsGoodCondition { get; set; }
        public bool VendorApproved { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
