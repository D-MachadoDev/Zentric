using FluentValidation;
using Zentric.Application.Users.Commands;

namespace Zentric.Application.Users.Validators
{
    public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
    {
        public CreateUserCommandValidator()
        {
            RuleFor(x => x.IdentityDocument)
                .NotEmpty().WithMessage("El documento de identidad es obligatorio.");

            RuleFor(x => x.FullName)
                .NotEmpty().WithMessage("El nombre completo es obligatorio.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("El correo electrónico es obligatorio.")
                .EmailAddress().WithMessage("Formato de correo inválido.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("La contraseña es obligatoria.")
                // Longitud minima de 8 caracteres.
                .MinimumLength(8).WithMessage("La contraseña debe tener al menos 8 caracteres.")
                .MaximumLength(128).WithMessage("La contraseña no puede superar 128 caracteres.");

            RuleFor(x => x.Role)
                .IsInEnum().WithMessage("Rol de usuario inválido.");
        }
    }
}
