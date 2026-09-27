using FluentValidation;
using Zentric.Application.Returns.Commands;

namespace Zentric.Application.Returns.Validators
{
    public sealed class RequestReturnCommandValidator : AbstractValidator<RequestReturnCommand>
    {
        public RequestReturnCommandValidator()
        {
            RuleFor(command => command.CustomerOrderId)
                .NotEmpty()
                .WithMessage("CustomerOrder ID is required.");

            RuleFor(command => command.VariantId)
                .NotEmpty()
                .WithMessage("Variant ID is required.");

            RuleFor(command => command.WarehouseId)
                .NotEmpty()
                .WithMessage("Warehouse ID is required.");

            RuleFor(command => command.Quantity)
                .GreaterThan(0)
                .WithMessage("Quantity must be greater than zero.");
                
            RuleFor(command => command.ProductType)
                .IsInEnum()
                .WithMessage("Valid ProductType is required.");
        }
    }
}
