using Zentric.Application.Common.Messaging;
using System;
using Zentric.Application.Common.Models;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Logistics.Commands
{
    /// <summary>
    /// Confirma la entrega de un despacho (<c>Dispatched → Delivered</c>).
    ///
    /// ADDENDUM Dominio 8, estado 4: "Entregado: Recibido por el comprador". El dominio ya tenia
    /// <c>Deliver()</c> y su invariante, pero no existia comando ni endpoint, de modo que ningun
    /// despacho podia cerrarse: se quedaba en Despachado para siempre.
    ///
    /// Quien lo ejecuta (dictamen del Owner, 2026-10-01): el **Operador Logistico**, con politica
    /// propia y fail-closed. La Ley describe el estado ("recibido por el comprador") pero no dice
    /// quien lo marca. Decidido el Operador porque el cierre de la entrega es, igual que el
    /// despacho, trabajo fisico de bodega quien ve salir la transportadora; el Comprador queda como
    /// solo lectura, que es lo coherente con que el auto-registro de Compradores sea lo mas
    /// restringido del sistema. El Vendedor queda fuera a proposito: no deberia poder cerrar la
    /// entrega de su propio paquete.
    /// </summary>
    public record DeliverFulfillmentCommand(
        Guid FulfillmentOrderId,
        Guid CallerId,
        UserRole CallerRole) : IRequest<Result<bool>>;
}