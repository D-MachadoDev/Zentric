using FluentValidation;
using Zentric.Application.Orders.Commands;

namespace Zentric.Application.Orders.Validators
{
    /// <summary>
    /// Validación de entrada de <see cref="RemoveOrderItemCommand"/>.
    /// Las reglas replican las guardas ya existentes en el dominio: <c>CustomerOrder.RemoveItem</c>,
    /// para que un error de formato nunca llegue a las entidades del dominio.
    /// </summary>
    public sealed class RemoveOrderItemCommandValidator : AbstractValidator<RemoveOrderItemCommand>
    {
        public RemoveOrderItemCommandValidator()
        {
            RuleFor(command => command.OrderId)
                .NotEmpty()
                .WithMessage("OrderId is required.");

            RuleFor(command => command.VariantId)
                .NotEmpty()
                .WithMessage("VariantId is required.");

            RuleFor(command => command.BuyerId)
                .NotEmpty()
                .WithMessage("BuyerId is required.");
        }
    }
}