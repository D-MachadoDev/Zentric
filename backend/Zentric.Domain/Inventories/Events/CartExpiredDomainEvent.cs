using System;
using Zentric.Domain.Common.Models;

namespace Zentric.Domain.Inventories.Events
{
    /// <summary>
    /// Emitido cuando un carrito expira por timeout de 15 minutos (PED-01).
    /// Permite al módulo de notificaciones avisar al comprador.
    /// </summary>
    /// <param name="OrderId">Identificador del carrito/pedido expirado.</param>
    /// <param name="ExpiredAt">Instante exacto de la expiración (UTC).</param>
    public record CartExpiredDomainEvent(Guid OrderId, DateTimeOffset ExpiredAt) : IDomainEvent;
}
