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
                .WithMessage("El identificador de pedido es obligatorio.");

            RuleFor(command => command.VariantId)
                .NotEmpty()
                .WithMessage("El identificador de variante es obligatorio.");

            RuleFor(command => command.BuyerId)
                .NotEmpty()
                .WithMessage("El identificador del comprador es obligatorio.");
        }
    }
}