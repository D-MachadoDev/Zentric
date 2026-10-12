using FluentValidation;
using Zentric.Application.Orders.Commands;

namespace Zentric.Application.Orders.Validators
{
    /// <summary>
    /// Validación de entrada de <see cref="CreateCartCommand"/> (AGENTS.md, secciones 3.2 y 4.3):
    /// el comprador es obligatorio y el agregado <c>CustomerOrder</c> también lo exige.
    /// </summary>
    public sealed class CreateCartCommandValidator : AbstractValidator<CreateCartCommand>
    {
        public CreateCartCommandValidator()
        {
            RuleFor(command => command.BuyerId)
                .NotEmpty()
                .WithMessage("BuyerId is required.");
        }
    }
}
