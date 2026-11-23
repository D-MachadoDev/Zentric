using FluentValidation;
using Zentric.Application.Catalog.Commands;

namespace Zentric.Application.Catalog.Validators
{
    public class CreateProductReviewCommandValidator : AbstractValidator<CreateProductReviewCommand>
    {
        public CreateProductReviewCommandValidator()
        {
            RuleFor(x => x.ProductId)
                .NotEmpty()
                .WithMessage("El identificador de producto es obligatorio.");

            RuleFor(x => x.UserId)
                .NotEmpty()
                .WithMessage("El identificador de usuario es obligatorio.");

            RuleFor(x => x.Rating)
                .InclusiveBetween(1, 5)
                .WithMessage("La calificación debe estar entre 1 y 5.");

            RuleFor(x => x.Comment)
                .MaximumLength(2000)
                .WithMessage("El comentario no puede superar los 2000 caracteres.")
                .When(x => !string.IsNullOrEmpty(x.Comment));
        }
    }
}
