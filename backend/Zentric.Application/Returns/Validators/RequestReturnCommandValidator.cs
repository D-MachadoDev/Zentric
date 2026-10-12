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
                
            // ADR-0018: ProductType y el lugar de recepcion NO se validan aqui porque ya
            // no vienen del cuerpo (el tipo lo deduce el producto en el servidor y la
            // recepcion se contrasta con bodegas reales).

            // Q-21b: identidad derivada del token por el controlador; el handler
            // la usa para verificar la propiedad del pedido.
            RuleFor(command => command.BuyerId)
                .NotEmpty()
                .WithMessage("BuyerId is required.");
        }
    }
}
