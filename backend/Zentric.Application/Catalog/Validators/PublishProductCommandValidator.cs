using FluentValidation;
using Zentric.Application.Catalog.Commands;

namespace Zentric.Application.Catalog.Validators
{
    public class PublishProductCommandValidator : AbstractValidator<PublishProductCommand>
    {
        public PublishProductCommandValidator()
        {
            RuleFor(x => x.ProductId).NotEmpty();
        }
    }
}
