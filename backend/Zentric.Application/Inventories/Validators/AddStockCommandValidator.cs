using FluentValidation;
using Zentric.Application.Inventories.Commands;

namespace Zentric.Application.Inventories.Validators
{
    public class AddStockCommandValidator : AbstractValidator<AddStockCommand>
    {
        public AddStockCommandValidator()
        {
            RuleFor(x => x.VariantId)
                .NotEmpty().WithMessage("El identificador de variante es obligatorio.");

            RuleFor(x => x.WarehouseId)
                .NotEmpty().WithMessage("El identificador de bodega es obligatorio.");

            RuleFor(x => x.Quantity)
                .GreaterThan(0).WithMessage("La cantidad debe ser mayor a cero.");

            // Identidad derivada del token por el controlador.
            RuleFor(x => x.CallerId)
                .NotEmpty().WithMessage("El identificador del solicitante es obligatorio.");
        }
    }
}
