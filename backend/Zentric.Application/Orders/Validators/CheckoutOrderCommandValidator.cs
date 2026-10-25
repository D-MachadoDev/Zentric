using FluentValidation;
using Zentric.Application.Orders.Commands;

namespace Zentric.Application.Orders.Validators
{
    public class CheckoutOrderCommandValidator : AbstractValidator<CheckoutOrderCommand>
    {
        public CheckoutOrderCommandValidator()
        {
            RuleFor(v => v.OrderId)
                .NotEmpty().WithMessage("Order ID is required.");

            // Identidad derivada del token por el controlador.
            RuleFor(v => v.BuyerId)
                .NotEmpty().WithMessage("BuyerId is required.");
        }
    }
}
