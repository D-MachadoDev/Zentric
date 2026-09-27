using FluentValidation;
using Zentric.Application.Orders.Commands;

namespace Zentric.Application.Orders.Validators
{
    /// <summary>
    /// Validación de entrada de <see cref="AddOrderItemCommand"/> (AGENTS.md, secciones 3.2 y 4.3).
    /// Las reglas replican las guardas ya existentes en el dominio: <c>CustomerOrder.AddItem</c>,
    /// <c>OrderItem</c> y el value object <c>Money</c>, para que un error de formato nunca
    /// llegue a las entidades del dominio.
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

            RuleFor(command => command.UnitPrice)
                .GreaterThanOrEqualTo(0)
                .WithMessage("Amount cannot be negative.");

            RuleFor(command => command.Currency)
                .NotEmpty()
                .WithMessage("Currency cannot be empty.");

            RuleFor(command => command.Currency)
                .Must(currency => currency is null || currency.Trim().Length == 3)
                .WithMessage("Currency must be a valid ISO code like USD, EUR, COP.");
        }
    }
}
