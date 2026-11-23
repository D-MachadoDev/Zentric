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
                .WithMessage("El identificador de pedido es obligatorio.");

            RuleFor(command => command.VariantId)
                .NotEmpty()
                .WithMessage("El identificador de variante es obligatorio.");

            RuleFor(command => command.Quantity)
                .GreaterThan(0)
                .WithMessage("La cantidad a devolver debe ser mayor a cero.");
                
            // ADProductType y el lugar de recepcion NO se validan aqui porque ya
            // no vienen del cuerpo (el tipo lo deduce el producto en el servidor y la
            // recepcion se contrasta con bodegas reales).

            // Identidad derivada del token por el controlador; el handler
            // la usa para verificar la propiedad del pedido.
            RuleFor(command => command.BuyerId)
                .NotEmpty()
                .WithMessage("El identificador del comprador es obligatorio.");
        }
    }
}
