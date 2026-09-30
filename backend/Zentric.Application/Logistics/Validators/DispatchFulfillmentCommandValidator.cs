using FluentValidation;
using Zentric.Application.Logistics.Commands;

namespace Zentric.Application.Logistics.Validators
{
    public class DispatchFulfillmentCommandValidator : AbstractValidator<DispatchFulfillmentCommand>
    {
        public DispatchFulfillmentCommandValidator()
        {
            RuleFor(v => v.FulfillmentOrderId)
                .NotEmpty().WithMessage("Fulfillment Order ID is required.");

            // Q-21b: identidad derivada del token por el controlador.
            RuleFor(v => v.CallerId)
                .NotEmpty().WithMessage("CallerId is required.");
        }
    }
}
