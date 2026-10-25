using FluentValidation;
using Zentric.Application.Logistics.Commands;

namespace Zentric.Application.Logistics.Validators
{
    /// <summary>
    /// Validación de entrada de <see cref="CreateFulfillmentOrderCommand"/>:
    /// el agregado <c>FulfillmentOrder</c> exige pedido de cliente y vendedor no vacíos.
    /// </summary>
    public sealed class CreateFulfillmentOrderCommandValidator : AbstractValidator<CreateFulfillmentOrderCommand>
    {
        public CreateFulfillmentOrderCommandValidator()
        {
            RuleFor(command => command.CustomerOrderId)
                .NotEmpty()
                .WithMessage("CustomerOrder ID is required.");

            RuleFor(command => command.VendorId)
                .NotEmpty()
                .WithMessage("Vendor ID is required.");

            // Identidad derivada del token por el controlador.
            RuleFor(command => command.CallerId)
                .NotEmpty()
                .WithMessage("CallerId is required.");
        }
    }
}
