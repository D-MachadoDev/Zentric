using Xunit;
using Zentric.Application.Logistics.Commands;
using Zentric.Application.Logistics.Validators;

namespace Zentric.Tests.UseCases
{
    /// <summary>
    /// Validación de entrada de <see cref="CreateFulfillmentOrderCommand"/>: el agregado
    /// <c>FulfillmentOrder</c> exige pedido de cliente y vendedor no vacíos.
    /// </summary>
    public class CreateFulfillmentOrderCommandValidatorTests
    {
        private readonly CreateFulfillmentOrderCommandValidator _validator = new();

        [Fact]
        public void Validate_ValidCommand_IsValid()
        {
            var result = _validator.Validate(new CreateFulfillmentOrderCommand(Guid.NewGuid(), Guid.NewGuid()));

            Assert.True(result.IsValid);
        }

        [Fact]
        public void Validate_EmptyCustomerOrderId_ReturnsError()
        {
            var result = _validator.Validate(new CreateFulfillmentOrderCommand(Guid.Empty, Guid.NewGuid()));

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, error => error.ErrorMessage == "CustomerOrder ID is required.");
        }

        [Fact]
        public void Validate_EmptyVendorId_ReturnsError()
        {
            var result = _validator.Validate(new CreateFulfillmentOrderCommand(Guid.NewGuid(), Guid.Empty));

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, error => error.ErrorMessage == "Vendor ID is required.");
        }
    }
}