using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Inventories.Events;
using Microsoft.Extensions.Logging;

namespace Zentric.Application.Orders.EventHandlers
{
    /// <summary>
    /// Consumidor de <see cref="CartExpiredDomainEvent"/>.
    ///
    /// Se ejecuta cuando un carrito expira por timeout de 15 minutos.
    /// Actualmente solo registra en log; preparado para integración futura con
    /// servicio de notificaciones (email, push, webhook).
    /// </summary>
    public sealed class CartExpiredConsumer : INotificationHandler<DomainEventNotification<CartExpiredDomainEvent>>
    {
        private readonly ILogger<CartExpiredConsumer> _logger;

        public CartExpiredConsumer(ILogger<CartExpiredConsumer> logger)
        {
            _logger = logger;
        }

        public async Task Handle(DomainEventNotification<CartExpiredDomainEvent> notification, CancellationToken cancellationToken)
        {
            var domainEvent = notification.DomainEvent;

            _logger.LogInformation(
                "Carrito expirado: OrderId={OrderId}, ExpiredAt={ExpiredAt}",
                domainEvent.OrderId,
                domainEvent.ExpiredAt);

            // TODO: Integrar con servicio de notificaciones (email, push, webhook)
            // Ejemplo futuro:
            // await _notificationService.SendAsync(new CartExpiredNotification
            // {
            //     OrderId = domainEvent.OrderId,
            //     ExpiredAt = domainEvent.ExpiredAt,
            //     BuyerId = await GetBuyerIdAsync(domainEvent.OrderId)
            // });

            await Task.CompletedTask;
        }
    }
}