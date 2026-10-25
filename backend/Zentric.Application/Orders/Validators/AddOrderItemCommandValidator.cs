using FluentValidation;
using Zentric.Application.Orders.Commands;

namespace Zentric.Application.Orders.Validators
{
    /// <summary>
    /// Validación de entrada de <see cref="AddOrderItemCommand"/>.
    /// Las reglas replican las guardas ya existentes en el dominio: <c>CustomerOrder.AddItem</c>
/// y <c>OrderItem</c>, para que un error de formato nunca llegue a las entidades del
    /// dominio. El precio y la moneda no se validan aqui porque no viajan en el comando
    /// (ADR-0020).
    /// </summary>
    public sealed class AddOrderItemCommandValidator : AbstractValidator<AddOrderItemCommand>
    {
        public AddOrderItemCommandValidator()
        {
            RuleFor(command => command.OrderId)
                .NotEmpty()
                .WithMessage("OrderId is required.");

            RuleFor(command => command.VariantId)
                .NotEmpty()
                .WithMessage("VariantId is required.");

            RuleFor(command => command.Quantity)
                .GreaterThan(0)
                .WithMessage("Quantity must be greater than zero.");

            // ADR-0020: no hay reglas de precio ni de moneda porque el contrato
            // ya no lleva esos campos. El precio lo sale del catalogo y Money lo valida
            // en el dominio; una regla aqui solo invitaria a revalidar algo que el
            // cliente ya no puede enviar.

            // La identidad la fija el controlador desde el token; la regla
            // es defensa en profundidad, igual que las demas.
            RuleFor(command => command.BuyerId)
                .NotEmpty()
                .WithMessage("BuyerId is required.");
        }
    }
}
