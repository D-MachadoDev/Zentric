using FluentValidation;
using Zentric.Application.Catalog.Commands;

namespace Zentric.Application.Catalog.Validators
{
    public class AddProductVariantCommandValidator : AbstractValidator<AddProductVariantCommand>
    {
        public AddProductVariantCommandValidator()
        {
            RuleFor(x => x.ProductId).NotEmpty();
            RuleFor(x => x.VendorId).NotEmpty();
            RuleFor(x => x.Sku).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Attributes).NotEmpty().WithMessage("A variant must declare at least one attribute.");
            RuleForEach(x => x.Attributes).ChildRules(attribute =>
            {
                attribute.RuleFor(a => a.Name).NotEmpty().MaximumLength(50);
                attribute.RuleFor(a => a.Value).NotEmpty().MaximumLength(50);
            });
            RuleFor(x => x.PriceAmount)
                .GreaterThan(0)
                .When(x => x.PriceAmount.HasValue)
                .WithMessage("Variant price must be positive when specified.");
        }
    }
}
