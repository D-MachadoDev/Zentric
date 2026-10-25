using FluentValidation;
using Zentric.Application.Orders.Commands;

namespace Zentric.Application.Orders.Validators
{
    /// <summary>
    /// Validación de entrada de <see cref="UpdateCartItemQuantityCommand"/>.
    /// Las reglas replican las guardas ya existentes en el dominio: <c>CustomerOrder.UpdateItemQuantity</c>,
    /// para que un error de formato nunca llegue a las entidades del dominio.
    /// </summary>
    public sealed class UpdateCartItemQuantityCommandValidator : AbstractValidator<UpdateCartItemQuantityCommand>
    {
        public UpdateCartItemQuantityCommandValidator()
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

            RuleFor(command => command.Quantity)
                .GreaterThanOrEqualTo(1)
                .WithMessage("Quantity must be at least 1.");
        }
    }
}