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
        }
    }
}
