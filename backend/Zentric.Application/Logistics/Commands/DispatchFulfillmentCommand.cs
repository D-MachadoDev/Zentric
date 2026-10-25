using Zentric.Application.Common.Messaging;
using System;
using Zentric.Application.Common.Models;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Logistics.Commands
{
    /// <summary>
    /// Despacha un paquete. El Vendedor solo despacha los suyos; el
    /// Operador despacha cualquiera, porque el trabajo es fisico y en bodega.
    /// </summary>
    public record DispatchFulfillmentCommand(
        Guid FulfillmentOrderId,
        Guid CallerId,
        UserRole CallerRole) : IRequest<Result<bool>>;
}
