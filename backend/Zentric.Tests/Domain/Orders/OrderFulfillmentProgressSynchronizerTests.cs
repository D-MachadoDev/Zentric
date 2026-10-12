using System;
using System.Collections.Generic;
using Xunit;
using Zentric.Domain.Logistics.Enums;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Orders.Services;

namespace Zentric.Tests.Domain.Orders
{
    /// <summary>
    /// PED-05: el pedido maestro refleja el minimo comun de SUS despachos. Un despacho
    /// cancelado por quiebre de stock (EXC-01) no se entrega nunca, asi que si se contara
    /// bloquearia al pedido para siempre. El dinero de esa linea se salda por EXC-02.
    /// </summary>
    public class OrderFulfillmentProgressSynchronizerTests
    {
        private static CustomerOrder PaidOrder() => new(Guid.NewGuid());

        [Fact(DisplayName = "TodosLosDespachosActivosEntregados_PasaElPedidoADelivered")]
        public void Synchronize_AllActiveDeliveries_MovesOrderToDelivered()
        {
            var order = PaidOrder();
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Zentric.Domain.Products.ValueObjects.Money(100m, "COP"));
            order.Checkout();
            order.MarkAsPaid();

            var synchronizer = new OrderFulfillmentProgressSynchronizer();
            synchronizer.Synchronize(order, new[] { FulfillmentStatus.Delivered, FulfillmentStatus.Delivered });

            Assert.Equal(OrderStatus.Delivered, order.Status);
        }

        [Fact(DisplayName = "UnDespachoCancelado_NoBloqueaAlPedidoMaestro")]
        public void Synchronize_OneCancelledDelivery_DoesNotBlockTheOrder()
        {
            // El escenario que hoy esta roto: un producto se pierde por stock fantasma
            // y el otro si llega. Con la regla literal de PED-05 el pedido se quedaria
            // en Paid para siempre.
            var order = PaidOrder();
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Zentric.Domain.Products.ValueObjects.Money(100m, "COP"));
            order.Checkout();
            order.MarkAsPaid();

            var synchronizer = new OrderFulfillmentProgressSynchronizer();
            synchronizer.Synchronize(order, new[] { FulfillmentStatus.Delivered, FulfillmentStatus.Cancelled });

            Assert.Equal(OrderStatus.Delivered, order.Status);
        }

        [Fact(DisplayName = "DespachoActivoTodaviaEmpacando_NoAvanzaElPedido")]
        public void Synchronize_OneActiveStillPacked_LeavesTheOrderPaid()
        {
            var order = PaidOrder();
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Zentric.Domain.Products.ValueObjects.Money(100m, "COP"));
            order.Checkout();
            order.MarkAsPaid();

            var synchronizer = new OrderFulfillmentProgressSynchronizer();
            synchronizer.Synchronize(order, new[] { FulfillmentStatus.Delivered, FulfillmentStatus.Packed });

            Assert.Equal(OrderStatus.Paid, order.Status);
        }

        [Fact(DisplayName = "TodosDespachados_PasaElPedidoADispatched")]
        public void Synchronize_AllActiveDispatched_MovesOrderToDispatched()
        {
            var order = PaidOrder();
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Zentric.Domain.Products.ValueObjects.Money(100m, "COP"));
            order.Checkout();
            order.MarkAsPaid();

            var synchronizer = new OrderFulfillmentProgressSynchronizer();
            synchronizer.Synchronize(order, new[] { FulfillmentStatus.Dispatched, FulfillmentStatus.Dispatched });

            Assert.Equal(OrderStatus.Dispatched, order.Status);
        }

        [Fact(DisplayName = "TodosDespachosCancelados_NoAvanzaElPedido")]
        public void Synchronize_EveryDeliveryCancelled_LeavesTheOrderPaid()
        {
            // Sin ninguna entrega no hay nada que entregar: marcar el pedido como
            // Delivered seria mentir. Se deja en Paid y la linea se resuelve por EXC-02.
            var order = PaidOrder();
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Zentric.Domain.Products.ValueObjects.Money(100m, "COP"));
            order.Checkout();
            order.MarkAsPaid();

            var synchronizer = new OrderFulfillmentProgressSynchronizer();
            synchronizer.Synchronize(order, new[] { FulfillmentStatus.Cancelled, FulfillmentStatus.Cancelled });

            Assert.Equal(OrderStatus.Paid, order.Status);
        }
    }
}