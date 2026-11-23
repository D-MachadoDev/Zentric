using FluentValidation;
using Zentric.Application.Logistics.Commands;

namespace Zentric.Application.Logistics.Validators
{
    public class DispatchFulfillmentCommandValidator : AbstractValidator<DispatchFulfillmentCommand>
    {
        public DispatchFulfillmentCommandValidator()
        {
            RuleFor(v => v.FulfillmentOrderId)
                .NotEmpty().WithMessage("El identificador de despacho es obligatorio.");

            // Identidad derivada del token por el controlador.
            RuleFor(v => v.CallerId)
                .NotEmpty().WithMessage("El identificador del solicitante es obligatorio.");
        }
    }
}
