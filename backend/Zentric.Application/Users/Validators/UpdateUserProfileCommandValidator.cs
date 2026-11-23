using FluentValidation;
using Zentric.Application.Users.Commands;

namespace Zentric.Application.Users.Validators
{
    public class UpdateUserProfileCommandValidator : AbstractValidator<UpdateUserProfileCommand>
    {
        public UpdateUserProfileCommandValidator()
        {
            RuleFor(x => x.UserId)
                .NotEmpty().WithMessage("El identificador de usuario es obligatorio.");

            RuleFor(x => x.FullName)
                .NotEmpty().WithMessage("El nombre completo es obligatorio.")
                .Must(name => !string.IsNullOrWhiteSpace(name) && name.Trim().Split(' ', System.StringSplitOptions.RemoveEmptyEntries).Length >= 2)
                .WithMessage("El nombre completo debe incluir nombre y apellido.");

            When(x => x.Address != null, () =>
            {
                RuleFor(x => x.Address!.Street)
                    .NotEmpty().WithMessage("La dirección es obligatoria.");

                RuleFor(x => x.Address!.City)
                    .NotEmpty().WithMessage("La ciudad es obligatoria.");

                RuleFor(x => x.Address!.State)
                    .NotEmpty().WithMessage("El departamento es obligatorio.");

                RuleFor(x => x.Address!.ZipCode)
                    .NotEmpty().WithMessage("El código postal es obligatorio.");

                RuleFor(x => x.Address!.Country)
                    .NotEmpty().WithMessage("El país es obligatorio.");
            });
        }
    }
}
