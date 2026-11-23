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
                .WithMessage("El identificador de pedido es obligatorio.");

            RuleFor(command => command.VendorId)
                .NotEmpty()
                .WithMessage("El identificador de vendedor es obligatorio.");

            // Identidad derivada del token por el controlador.
            RuleFor(command => command.CallerId)
                .NotEmpty()
                .WithMessage("El identificador del solicitante es obligatorio.");
        }
    }
}
