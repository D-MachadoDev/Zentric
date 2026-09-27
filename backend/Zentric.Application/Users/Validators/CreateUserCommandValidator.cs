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

            RuleFor(x => x.PasswordHash)
                .NotEmpty().WithMessage("Password hash cannot be empty.");

            RuleFor(x => x.Role)
                .IsInEnum().WithMessage("Invalid user role.");
        }
    }
}
