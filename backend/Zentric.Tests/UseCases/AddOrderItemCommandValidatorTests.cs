using Xunit;
using Zentric.Application.Orders.Commands;
using Zentric.Application.Orders.Validators;

namespace Zentric.Tests.UseCases
{
    /// <summary>
    /// Validación de entrada de <see cref="AddOrderItemCommand"/>. Las reglas espejan las
    /// guardas del dominio (<c>OrderItem</c>, <c>CustomerOrder.AddItem</c> y <c>Money</c>),
    /// de modo que un error de formato nunca alcanza las entidades.
    /// </summary>
    public class AddOrderItemCommandValidatorTests
    {
        private readonly AddOrderItemCommandValidator _validator = new();

        private static AddOrderItemCommand ValidCommand() =>
            new(Guid.NewGuid(), Guid.NewGuid(), 2, 19.99m, "USD");

        [Fact]
        public void Validate_ValidCommand_IsValid()
        {
            var result = _validator.Validate(ValidCommand());

            Assert.True(result.IsValid);
        }

        [Fact]
        public void Validate_EmptyOrderId_ReturnsError()
        {
            var command = ValidCommand() with { OrderId = Guid.Empty };

            var result = _validator.Validate(command);

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, error => error.ErrorMessage == "OrderId is required.");
        }

        [Fact]
        public void Validate_EmptyVariantId_ReturnsError()
        {
            var command = ValidCommand() with { VariantId = Guid.Empty };

            var result = _validator.Validate(command);

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, error => error.ErrorMessage == "VariantId is required.");
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void Validate_NonPositiveQuantity_ReturnsError(int quantity)
        {
            var command = ValidCommand() with { Quantity = quantity };

            var result = _validator.Validate(command);

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, error => error.ErrorMessage == "Quantity must be greater than zero.");
        }

        [Fact]
        public void Validate_NegativeUnitPrice_ReturnsError()
        {
            var command = ValidCommand() with { UnitPrice = -0.01m };

            var result = _validator.Validate(command);

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, error => error.ErrorMessage == "Amount cannot be negative.");
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void Validate_EmptyCurrency_ReturnsError(string currency)
        {
            var command = ValidCommand() with { Currency = currency };

            var result = _validator.Validate(command);

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, error => error.ErrorMessage == "Currency cannot be empty.");
        }

        [Theory]
        [InlineData("US")]
        [InlineData("USDD")]
        public void Validate_CurrencyWithoutIsoLength_ReturnsError(string currency)
        {
            var command = ValidCommand() with { Currency = currency };

            var result = _validator.Validate(command);

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, error => error.ErrorMessage == "Currency must be a valid ISO code like USD, EUR, COP.");
        }

        [Theory]
        [InlineData("usd")]
        [InlineData(" COP ")]
        public void Validate_CurrencyNormalizableByMoney_IsValid(string currency)
        {
            // Money normaliza con Trim + ToUpperInvariant y exige longitud 3,
            // por lo que estos valores son válidos para el dominio.
            var command = ValidCommand() with { Currency = currency };

            var result = _validator.Validate(command);

            Assert.True(result.IsValid);
        }
    }
}