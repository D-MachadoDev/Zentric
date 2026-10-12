using FluentValidation;
using Zentric.Application.Orders.Commands;

namespace Zentric.Application.Orders.Validators
{
    public class PayOrderCommandValidator : AbstractValidator<PayOrderCommand>
    {
        public PayOrderCommandValidator()
        {
            RuleFor(x => x.OrderId)
                .NotEmpty().WithMessage("OrderId cannot be empty.");

            // Q-21b: identidad derivada del token por el controlador.
            RuleFor(x => x.BuyerId)
                .NotEmpty().WithMessage("BuyerId is required.");
        }
    }
}
