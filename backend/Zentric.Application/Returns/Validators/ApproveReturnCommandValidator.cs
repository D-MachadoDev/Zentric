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
                .WithMessage("El identificador de solicitud de devolución es obligatorio.");

            // Identidad derivada del token por el controlador.
            RuleFor(command => command.CallerId)
                .NotEmpty()
                .WithMessage("El identificador del solicitante es obligatorio.");
        }
    }
}
