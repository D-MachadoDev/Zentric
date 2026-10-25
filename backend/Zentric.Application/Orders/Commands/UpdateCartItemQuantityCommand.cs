using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;

namespace Zentric.Application.Orders.Commands
{
    /// <summary>
    /// Actualiza la cantidad de una línea del carrito.
    /// </summary>
    public record UpdateCartItemQuantityCommand(
        Guid OrderId,
        Guid VariantId,
        int Quantity,
        Guid BuyerId) : IRequest<Result>;
}