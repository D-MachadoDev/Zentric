using Xunit;
using Zentric.Application.Orders.Commands;
using Zentric.Application.Orders.Validators;

namespace Zentric.Tests.UseCases
{
    /// <summary>
    /// Validación de entrada de <see cref="CreateCartCommand"/> (AGENTS.md, secciones 3.2 y 4.3):
    /// se cubre antes de que el comando toque el dominio.
    /// </summary>
    public class CreateCartCommandValidatorTests
    {
        private readonly CreateCartCommandValidator _validator = new();

        [Fact]
        public void Validate_ValidBuyerId_IsValid()
        {
            var result = _validator.Validate(new CreateCartCommand(Guid.NewGuid()));

            Assert.True(result.IsValid);
        }

        [Fact]
        public void Validate_EmptyBuyerId_ReturnsError()
        {
            var result = _validator.Validate(new CreateCartCommand(Guid.Empty));

            Assert.False(result.IsValid);
            Assert.Single(result.Errors);
            Assert.Equal("BuyerId is required.", result.Errors[0].ErrorMessage);
        }
    }
}