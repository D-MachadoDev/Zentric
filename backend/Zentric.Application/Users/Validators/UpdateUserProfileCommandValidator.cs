using FluentValidation;
using Zentric.Application.Users.Commands;

namespace Zentric.Application.Users.Validators
{
    public class UpdateUserProfileCommandValidator : AbstractValidator<UpdateUserProfileCommand>
    {
        public UpdateUserProfileCommandValidator()
        {
            RuleFor(x => x.UserId)
                .NotEmpty().WithMessage("UserId cannot be empty.");

            RuleFor(x => x.FullName)
                .NotEmpty().WithMessage("Full name cannot be empty.")
                .Must(name => !string.IsNullOrWhiteSpace(name) && name.Trim().Split(' ', System.StringSplitOptions.RemoveEmptyEntries).Length >= 2)
                .WithMessage("Full name must include first name and last name.");

            When(x => x.Address != null, () =>
            {
                RuleFor(x => x.Address!.Street)
                    .NotEmpty().WithMessage("Street cannot be empty.");

                RuleFor(x => x.Address!.City)
                    .NotEmpty().WithMessage("City cannot be empty.");

                RuleFor(x => x.Address!.State)
                    .NotEmpty().WithMessage("State cannot be empty.");

                RuleFor(x => x.Address!.ZipCode)
                    .NotEmpty().WithMessage("ZipCode cannot be empty.");

                RuleFor(x => x.Address!.Country)
                    .NotEmpty().WithMessage("Country cannot be empty.");
            });
        }
    }
}
