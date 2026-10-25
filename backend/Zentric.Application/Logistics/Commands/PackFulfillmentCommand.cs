using Zentric.Application.Common.Messaging;
using System;
using Zentric.Application.Common.Models;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Logistics.Commands
{
    /// <summary>
    /// Marca un paquete como empacado (<c>PendingPack → Packed</c>).
    ///
    /// ADDENDUM Dominio 8, estado 2: "Empacado: Listo para recolección". El dominio ya tenia
    /// <c>Pack()</c> y su invariante, pero no existia comando ni endpoint: el paquete se quedaba
    /// en Pendiente de Empaque para siempre, y <c>Dispatch()</c> exigia estar Packed. Es decir, el
    /// ciclo de despacho no se podia completar por HTTP.
    ///
    /// Politica: la misma que el despacho (<c>FulfillmentOperate</c>). Empaque y despacho son el
    /// mismo trabajo fisico en bodega, y separarlos por rol no aportaria nada.
    /// </summary>
    public record PackFulfillmentCommand(
        Guid FulfillmentOrderId,
        Guid CallerId,
        UserRole CallerRole) : IRequest<Result<bool>>;
}