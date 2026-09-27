using System;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using Zentric.Domain.Products;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class ProductMapper
    {
        public static Product ToDomain(ProductDbModel dbModel)
        {
            var prod = (Product)RuntimeHelpers.GetUninitializedObject(typeof(Product));
            
            typeof(Product).GetProperty("Id")?.SetValue(prod, dbModel.Id);
            typeof(Product).GetProperty("VendorId")?.SetValue(prod, dbModel.VendorId);
            typeof(Product).GetProperty("Name")?.SetValue(prod, dbModel.Name);
            typeof(Product).GetProperty("Description")?.SetValue(prod, dbModel.Description);
            typeof(Product).GetProperty("Price")?.SetValue(prod, new Money(dbModel.Price.Amount, dbModel.Price.Currency));
            typeof(Product).GetProperty("Type")?.SetValue(prod, dbModel.Type);
            typeof(Product).GetProperty("Status")?.SetValue(prod, dbModel.Status);
            typeof(Product).GetProperty("CreatedAt")?.SetValue(prod, dbModel.CreatedAt);
            typeof(Product).GetProperty("UpdatedAt")?.SetValue(prod, dbModel.UpdatedAt);
            typeof(Product).GetProperty("DeletedAt")?.SetValue(prod, dbModel.DeletedAt);

            var variantsField = typeof(Product).GetField("_variants", BindingFlags.NonPublic | BindingFlags.Instance);
            var variantsList = new System.Collections.Generic.List<ProductVariant>();
            
            if (dbModel.Variants != null)
            {
                foreach (var varDb in dbModel.Variants)
                {
                    var variant = (ProductVariant)RuntimeHelpers.GetUninitializedObject(typeof(ProductVariant));
                    typeof(ProductVariant).GetProperty("Id")?.SetValue(variant, varDb.Id);
                    typeof(ProductVariant).GetProperty("ProductId")?.SetValue(variant, varDb.ProductId);
                    typeof(ProductVariant).GetProperty("Sku")?.SetValue(variant, varDb.Sku);
                    typeof(ProductVariant).GetProperty("IsActive")?.SetValue(variant, varDb.IsActive);
                    typeof(ProductVariant).GetProperty("CreatedAt")?.SetValue(variant, varDb.CreatedAt);
                    typeof(ProductVariant).GetProperty("UpdatedAt")?.SetValue(variant, varDb.UpdatedAt);

                    var attrField = typeof(ProductVariant).GetField("_attributes", BindingFlags.NonPublic | BindingFlags.Instance);
                    var attrList = new System.Collections.Generic.List<VariantAttribute>();
                    if (varDb.Attributes != null)
                    {
                        foreach (var attrDb in varDb.Attributes)
                        {
                            var attr = (VariantAttribute)RuntimeHelpers.GetUninitializedObject(typeof(VariantAttribute));
                            typeof(VariantAttribute).GetProperty("Name")?.SetValue(attr, attrDb.Name);
                            typeof(VariantAttribute).GetProperty("Value")?.SetValue(attr, attrDb.Value);
                            attrList.Add(attr);
                        }
                    }
                    attrField?.SetValue(variant, attrList);
                    variantsList.Add(variant);
                }
            }
            variantsField?.SetValue(prod, variantsList);
            return prod;
        }

        public static ProductDbModel ToDbModel(Product domain)
        {
            var dbModel = new ProductDbModel
            {
                Id = domain.Id,
                VendorId = domain.VendorId,
                Name = domain.Name,
                Description = domain.Description,
                Price = new MoneyDbModel { Amount = domain.Price.Amount, Currency = domain.Price.Currency },
                Type = domain.Type,
                Status = domain.Status,
                CreatedAt = domain.CreatedAt,
                UpdatedAt = domain.UpdatedAt,
                DeletedAt = domain.DeletedAt
            };

            foreach (var variant in domain.Variants)
            {
                var varDb = new ProductVariantDbModel
                {
                    Id = variant.Id,
                    ProductId = variant.ProductId,
                    Sku = variant.Sku,
                    IsActive = variant.IsActive,
                    CreatedAt = variant.CreatedAt,
                    UpdatedAt = variant.UpdatedAt
                };
                foreach (var attr in variant.Attributes)
                {
                    varDb.Attributes.Add(new VariantAttributeDbModel
                    {
                        Name = attr.Name,
                        Value = attr.Value
                    });
                }
                dbModel.Variants.Add(varDb);
            }
            return dbModel;
        }
    }
}
