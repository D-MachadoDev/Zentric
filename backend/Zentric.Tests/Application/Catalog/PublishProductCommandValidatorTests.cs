using System;
using Xunit;
using Zentric.Application.Catalog.Commands;
using Zentric.Application.Catalog.Validators;

namespace Zentric.Tests.Application.Catalog
{
    public class PublishProductCommandValidatorTests
    {
        private readonly PublishProductCommandValidator _validator = new();

        [Fact]
        public void Validate_ValidProductId_IsValid()
        {
            var command = new PublishProductCommand(Guid.NewGuid());
            var result = _validator.Validate(command);
            Assert.True(result.IsValid);
        }

        [Fact]
        public void Validate_EmptyProductId_ReturnsError()
        {
            var command = new PublishProductCommand(Guid.Empty);
            var result = _validator.Validate(command);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "ProductId");
        }
    }
}
