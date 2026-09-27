using System;
using System.Collections.Generic;
using Xunit;
using Zentric.Application.Catalog.Commands;
using Zentric.Application.Catalog.Validators;
using Zentric.Domain.Products.Enums;

namespace Zentric.Tests.Application.Catalog
{
    public class CreateProductCommandValidatorTests
    {
        private readonly CreateProductCommandValidator _validator = new();

        [Fact]
        public void Validate_ValidPhysicalProduct_IsValid()
        {
            var command = new CreateProductCommand(
                Name: "Phone",
                Description: "Smartphone",
                PriceAmount: 999m,
                PriceCurrency: "USD",
                VendorId: Guid.NewGuid(),
                Type: ProductType.Physical,
                Variants: new List<CreateProductVariantDto>
                {
                    new CreateProductVariantDto("SKU-1", new List<VariantAttributeDto>
                    {
                        new VariantAttributeDto("Color", "Black")
                    })
                }
            );

            var result = _validator.Validate(command);
            Assert.True(result.IsValid);
        }

        [Fact]
        public void Validate_PhysicalProductWithoutVariants_ReturnsError()
        {
            var command = new CreateProductCommand(
                Name: "Phone",
                Description: "Smartphone",
                PriceAmount: 999m,
                PriceCurrency: "USD",
                VendorId: Guid.NewGuid(),
                Type: ProductType.Physical,
                Variants: new List<CreateProductVariantDto>() // Empty variants
            );

            var result = _validator.Validate(command);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "Variants" && e.ErrorMessage == "A physical product requires at least one variant.");
        }
    }
}
