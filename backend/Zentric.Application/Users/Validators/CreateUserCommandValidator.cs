using FluentValidation;
using Zentric.Application.Users.Commands;

namespace Zentric.Application.Users.Validators
{
    public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
    {
        public CreateUserCommandValidator()
        {
            RuleFor(x => x.IdentityDocument)
                .NotEmpty().WithMessage("Identity document cannot be empty.");

            RuleFor(x => x.FullName)
                .NotEmpty().WithMessage("Full name cannot be empty.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email cannot be empty.")
                .EmailAddress().WithMessage("Email format is invalid.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password cannot be empty.")
                // Minimo tecnico de 8 caracteres (ADR-0009). La Ley no define
                // politica de contrasenas; queda como sub-decicion pendiente de
                // ratificacion del Owner.
                .MinimumLength(8).WithMessage("Password must be at least 8 characters long.")
                .MaximumLength(128).WithMessage("Password must be at most 128 characters long.");

            RuleFor(x => x.Role)
                .IsInEnum().WithMessage("Invalid user role.");
        }
    }
}
