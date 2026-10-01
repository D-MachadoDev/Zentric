using Zentric.Application.Common.Messaging;
using System;
using Zentric.Application.Common.Models;

namespace Zentric.Application.Orders.Commands
{
    /// <summary>
    /// Checkout de un carrito. Q-21b: <paramref name="BuyerId"/> viaja para que
    /// el handler cargue el pedido con el filtro por comprador, de modo que solo
    /// se pueda hacer checkout de un carrito propio.
    /// </summary>
    public record CheckoutOrderCommand(Guid OrderId, Guid BuyerId) : IRequest<Result<bool>>;
}
