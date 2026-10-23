using Xunit;
using Zentric.Application.Orders.Commands;
using Zentric.Application.Orders.Validators;

namespace Zentric.Tests.UseCases
{
    /// <summary>
    /// Validación de entrada de <see cref="AddOrderItemCommand"/>. Las reglas espejan las
    /// guardas del dominio (<c>OrderItem</c> y <c>CustomerOrder.AddItem</c>),
    /// de modo que un error de formato nunca alcanza las entidades. No hay reglas de
    /// precio ni de moneda: esos campos no viajan en el comando (ADR-0020).
    /// </summary>
    public class AddOrderItemCommandValidatorTests
    {
        private readonly AddOrderItemCommandValidator _validator = new();

        private static AddOrderItemCommand ValidCommand() =>
            new(Guid.NewGuid(), Guid.NewGuid(), 2, Guid.NewGuid());

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
        public void Validate_EmptyBuyerId_ReturnsError()
        {
            // La identidad la fija el token; esta regla es defensa en
            // profundidad para que un comando mal compuesto nunca llegue al handler.
            var command = ValidCommand() with { BuyerId = Guid.Empty };

            var result = _validator.Validate(command);

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, error => error.ErrorMessage == "BuyerId is required.");
        }
    }
}