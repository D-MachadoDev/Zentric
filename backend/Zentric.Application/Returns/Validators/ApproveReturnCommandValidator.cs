using FluentValidation;
using Zentric.Application.Returns.Commands;

namespace Zentric.Application.Returns.Validators
{
    public sealed class ApproveReturnCommandValidator : AbstractValidator<ApproveReturnCommand>
    {
        public ApproveReturnCommandValidator()
        {
            RuleFor(command => command.ReturnRequestId)
                .NotEmpty()
                .WithMessage("ReturnRequest ID is required.");

            // Q-21b: identidad derivada del token por el controlador.
            RuleFor(command => command.CallerId)
                .NotEmpty()
                .WithMessage("CallerId is required.");
        }
    }
}
