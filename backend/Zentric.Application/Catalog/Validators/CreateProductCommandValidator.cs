using FluentValidation;
using Zentric.Application.Catalog.Commands;
using Zentric.Domain.Products.Enums;

namespace Zentric.Application.Catalog.Validators
{
    public class CreateProductCommandValidator : AbstractValidator<CreateProductCommand>
    {
        public CreateProductCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Description).NotEmpty().MaximumLength(2000);
            RuleFor(x => x.PriceAmount).GreaterThanOrEqualTo(0);
            RuleFor(x => x.PriceCurrency).NotEmpty().Length(3);
            RuleFor(x => x.VendorId).NotEmpty();
            RuleFor(x => x.Type).IsInEnum();

            RuleFor(x => x.Variants)
                .NotEmpty()
                .When(x => x.Type == ProductType.Physical)
                .WithMessage("A physical product requires at least one variant.");

            RuleForEach(x => x.Variants).ChildRules(variant =>
            {
                variant.RuleFor(v => v.Sku).NotEmpty().MaximumLength(100);
                variant.RuleForEach(v => v.Attributes).ChildRules(attribute =>
                {
                    attribute.RuleFor(a => a.Name).NotEmpty().MaximumLength(50);
                    attribute.RuleFor(a => a.Value).NotEmpty().MaximumLength(50);
                });
            });
        }
    }
}
