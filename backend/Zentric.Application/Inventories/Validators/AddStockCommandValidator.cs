using FluentValidation;
using Zentric.Application.Inventories.Commands;

namespace Zentric.Application.Inventories.Validators
{
    public class AddStockCommandValidator : AbstractValidator<AddStockCommand>
    {
        public AddStockCommandValidator()
        {
            RuleFor(x => x.VariantId)
                .NotEmpty().WithMessage("VariantId is required.");

            RuleFor(x => x.WarehouseId)
                .NotEmpty().WithMessage("WarehouseId is required.");

            RuleFor(x => x.Quantity)
                .GreaterThan(0).WithMessage("Quantity must be greater than zero.");
        }
    }
}
