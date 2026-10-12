using System;
using System.Collections.Generic;
using Zentric.Domain.Products.Enums;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class ProductDbModel
    {
        public Guid Id { get; set; }
        public Guid VendorId { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public MoneyDbModel Price { get; set; } = null!;
        public ProductType Type { get; set; }
        public ProductStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? DeletedAt { get; set; }
        public ICollection<ProductVariantDbModel> Variants { get; set; } = new List<ProductVariantDbModel>();
    }

    public class ProductVariantDbModel
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public string Sku { get; set; } = null!;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public ICollection<VariantAttributeDbModel> Attributes { get; set; } = new List<VariantAttributeDbModel>();
        public ProductDbModel Product { get; set; } = null!;
    }

    public class VariantAttributeDbModel
    {
        public string Name { get; set; } = null!;
        public string Value { get; set; } = null!;
    }
}
