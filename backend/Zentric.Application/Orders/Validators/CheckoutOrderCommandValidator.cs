using FluentValidation;
using Zentric.Application.Orders.Commands;

namespace Zentric.Application.Orders.Validators
{
    public class CheckoutOrderCommandValidator : AbstractValidator<CheckoutOrderCommand>
    {
        public CheckoutOrderCommandValidator()
        {
            RuleFor(v => v.OrderId)
                .NotEmpty().WithMessage("El identificador de pedido es obligatorio.");

            // Identidad derivada del token por el controlador.
            RuleFor(v => v.BuyerId)
                .NotEmpty().WithMessage("El identificador del comprador es obligatorio.");
        }
    }
}
