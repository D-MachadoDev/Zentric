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
                .NotEmpty().WithMessage("El nombre de la bodega es obligatorio.");

            RuleFor(x => x.Location)
                .NotEmpty().WithMessage("La ubicación de la bodega es obligatoria.");

            RuleFor(x => x.Capacity)
                .GreaterThanOrEqualTo(0).WithMessage("La capacidad no puede ser negativa.");

            RuleFor(x => x.Type)
                .IsInEnum().WithMessage("Tipo de bodega inválido.");

            RuleFor(x => x)
                .Must(x => !(x.Type == WarehouseType.Marketplace && x.VendorId.HasValue))
                .WithMessage("Las bodegas del marketplace no pueden tener un vendedor asignado.");

            RuleFor(x => x)
                .Must(x => !(x.Type == WarehouseType.Vendor && !x.VendorId.HasValue))
                .WithMessage("Las bodegas de vendedor deben tener un vendedor asignado.");
        }
    }
}
