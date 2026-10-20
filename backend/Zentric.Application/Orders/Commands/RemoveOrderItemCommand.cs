using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;

namespace Zentric.Application.Orders.Commands
{
    /// <summary>
    /// Remueve una línea del carrito.
    ///
    /// P2: El carrito vacío permanece en estado Cart (navegable).
    /// P3: No se emite evento de dominio al remover ítem.
    /// </summary>
    public record RemoveOrderItemCommand(
        Guid OrderId,
        Guid VariantId,
        Guid BuyerId) : IRequest<Result>;
}