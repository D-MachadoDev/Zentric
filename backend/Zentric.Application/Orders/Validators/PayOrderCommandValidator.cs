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
        }
    }
}
