using FluentValidation;
using Zentric.Application.Orders.Commands;

namespace Zentric.Application.Orders.Validators
{
    public class PayOrderCommandValidator : AbstractValidator<PayOrderCommand>
    {
        public PayOrderCommandValidator()
        {
            RuleFor(x => x.OrderId)
                .NotEmpty().WithMessage("El identificador de pedido no puede estar vacío.");

            // Identidad derivada del token por el controlador.
            RuleFor(x => x.BuyerId)
                .NotEmpty().WithMessage("El identificador del comprador es obligatorio.");
        }
    }
}
