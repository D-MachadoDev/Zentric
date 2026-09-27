using FluentValidation;
using Zentric.Application.Warehouses.Commands;
using Zentric.Domain.Warehouses.Enum;

namespace Zentric.Application.Warehouses.Validators
{
    public class CreateWarehouseCommandValidator : AbstractValidator<CreateWarehouseCommand>
    {
        public CreateWarehouseCommandValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Warehouse name is required.");

            RuleFor(x => x.Location)
                .NotEmpty().WithMessage("Warehouse location is required.");

            RuleFor(x => x.Capacity)
                .GreaterThanOrEqualTo(0).WithMessage("Capacity cannot be negative.");

            RuleFor(x => x.Type)
                .IsInEnum().WithMessage("Invalid warehouse type.");

            RuleFor(x => x)
                .Must(x => !(x.Type == WarehouseType.Marketplace && x.VendorId.HasValue))
                .WithMessage("Marketplace warehouses cannot have a vendor assigned.");

            RuleFor(x => x)
                .Must(x => !(x.Type == WarehouseType.Vendor && !x.VendorId.HasValue))
                .WithMessage("Vendor warehouses must have a vendor assigned.");
        }
    }
}
