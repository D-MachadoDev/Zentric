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
                .WithMessage("ProductId cannot be empty.");

            RuleFor(x => x.UserId)
                .NotEmpty()
                .WithMessage("UserId cannot be empty.");

            RuleFor(x => x.Rating)
                .InclusiveBetween(1, 5)
                .WithMessage("Rating must be between 1 and 5.");

            RuleFor(x => x.Comment)
                .MaximumLength(2000)
                .WithMessage("Comment cannot exceed 2000 characters.")
                .When(x => !string.IsNullOrEmpty(x.Comment));
        }
    }
}
