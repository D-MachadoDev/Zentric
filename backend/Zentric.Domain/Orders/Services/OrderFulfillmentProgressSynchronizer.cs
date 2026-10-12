using System;
using System.Collections.Generic;
using System.Linq;
using Zentric.Domain.Logistics.Enums;
using Zentric.Domain.Orders.Enums;

namespace Zentric.Domain.Orders.Services
{
    /// <summary>
    /// PED-05: el pedido maestro refleja el minimo comun de SUS despachos.
    ///
    /// Se invoca tras cada cambio de estado de un despacho (despachar, entregar o
    /// cancelar) y decide si el pedido maestro puede avanzar. El agregado
    /// <see cref="CustomerOrder"/> sigue siendo la unica autoridad sobre su propio
    /// estado: este servicio solo decide *cuando* llamarla, nunca *a que* estado.
    /// </summary>
    public sealed class OrderFulfillmentProgressSynchronizer
    {
        /// <param name="order">Pedido maestro a sincronizar.</param>
        /// <param name="fulfillmentStatuses">Estado actual de cada despacho del pedido.</param>
        public void Synchronize(CustomerOrder order, IEnumerable<FulfillmentStatus> fulfillmentStatuses)
        {
            if (order == null) throw new ArgumentNullException(nameof(order));
            if (fulfillmentStatuses == null) throw new ArgumentNullException(nameof(fulfillmentStatuses));

            // EXC-01: un despacho cancelado por quiebre de stock no llegara jamas a
            // entregarse. Contarlo como pendiente dejaria al pedido maestro en Paid para
            // siempre, aunque todo lo demas ya este entregado; su linea se salda con el
            // credito parcial de EXC-02, de modo que no bloquea al resto del pedido.
            var active = fulfillmentStatuses.Where(s => s != FulfillmentStatus.Cancelled).ToList();

            // Si no queda ninguna entrega activa, no hay nada entregado: marcar el pedido
            // como Delivered seria mentir. Se queda donde esta y las lineas se resuelven
            // por EXC-02.
            if (active.Count == 0)
            {
                return;
            }

            if (order.Status == OrderStatus.Paid && active.All(s => s >= FulfillmentStatus.Dispatched))
            {
                order.Dispatch();
            }

            // Se comprueba de nuevo porque Dispatch() acaba de cambiar el estado: una
            // sola llamada puede recorrer las dos transiciones del maestro.
            if (order.Status == OrderStatus.Dispatched && active.All(s => s == FulfillmentStatus.Delivered))
            {
                order.Deliver();
            }
        }
    }
}