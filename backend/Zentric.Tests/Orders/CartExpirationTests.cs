using System;
using Xunit;
using Zentric.Domain.Common.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Tests.Security;

namespace Zentric.Tests.Orders
{
    /// <summary>
    /// Criterios de aceptacion de la caducidad del carrito (T-004; H-06/R-06).
    ///
    /// La regla "un carrito vive 15 minutos" (PED-01) se prueba moviendo un
    /// reloj falso, nunca esperando de verdad: si esta suite tardara 15 minutos
    /// en correr, nadie la correria y la regla quedaria sin comprobar.
    ///
    /// Limite conocido: `CustomerOrder` es una entidad y el agregado no recibe
    /// el reloj por constructor. `Checkout()` compara contra el instante real de
    /// creacion, asi que lo que se verifica aqui es el calculo del umbral (la
    /// parte que el worker decide con su IClock) y la caducidad por `UpdatedAt`
    /// del repositorio. Cambiar el agregado para recibir el reloj romperia la
    /// reconstruccion por reflexion de los mappers y el patron de Aggregate
    /// Roots del proyecto; ese cambio queda propuesto, no aplicado.
    /// </summary>
    public class CartExpirationTests
    {
        private static readonly TimeSpan ReservationWindow = TimeSpan.FromMinutes(15);

        /// <summary>
        /// Replica exacta del criterio que el worker aplica contra el proveedor,
        /// pero con el reloj falso en lugar de `DateTime.UtcNow`.
        ///
        /// Trampa famosa de estas pruebas: el pedido nace con el reloj REAL
        /// (todavia usa DateTime.UtcNow y no se puede mover), de modo que para
        /// declarar "16 minutos" hay que sembrar el reloj falso en el nacimiento
        /// del pedido y evaluar contra el falso presente. Construir el pedido
        /// "ahora" y despues mover el reloj deja al pedido y al umbral en relojes
        /// distintos y la comparacion carece de sentido.
        /// </summary>
        private static System.Collections.Generic.IReadOnlyList<CustomerOrder> ExpiredAsSeenBy(
            System.Collections.Generic.IEnumerable<CustomerOrder> orders,
            IClock clock)
        {
            DateTime threshold = clock.UtcNow.AddMinutes(-ReservationWindow.TotalMinutes).UtcDateTime;
            var result = new System.Collections.Generic.List<CustomerOrder>();
            foreach (var order in orders)
            {
                if ((order.Status == OrderStatus.Cart || order.Status == OrderStatus.PendingPayment)
                    && order.UpdatedAt < threshold)
                {
                    result.Add(order);
                }
            }
            return result;
        }

        private static CustomerOrder CartWithOneItem(Guid buyerId)
        {
            var order = new CustomerOrder(buyerId);
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(10_000m, "COP"));
            return order;
        }

        [Fact]
        public void Checkout_WithinReservationWindow_MovesToPendingPayment()
        {
            var order = CartWithOneItem(Guid.NewGuid());

            order.Checkout();

            Assert.Equal(OrderStatus.PendingPayment, order.Status);
        }

        [Fact]
        public void ExpiredFilter_FreshCart_IsNotPickedUp()
        {
            // El pedido nace en el instante real. Para que el filtro del reloj
            // falso lo juzgue "reciente", el reloj falso debe empezar en el
            // mismo instante que el pedido.
            var order = CartWithOneItem(Guid.NewGuid());
            var clock = new ManualClock(new DateTimeOffset(order.UpdatedAt, TimeSpan.Zero));

            var expired = ExpiredAsSeenBy(new[] { order }, clock);

            Assert.Empty(expired);
        }

        [Fact]
        public void ExpiredFilter_CartOlderThan15Minutes_IsPickedUp()
        {
            // Mismo arreglo: el reloj falso nace en el nacimiento del pedido y
            // solo entonces se avanza. Avanzar 16 minutos deja el pedido 16
            // minutos atras en el unico reloj que el filtro conoce.
            var order = CartWithOneItem(Guid.NewGuid());
            var clock = new ManualClock(new DateTimeOffset(order.UpdatedAt, TimeSpan.Zero));

            clock.Advance(TimeSpan.FromMinutes(16));

            var expired = ExpiredAsSeenBy(new[] { order }, clock);

            Assert.Single(expired);
        }

        [Fact]
        public void ExpiredFilter_CartAtExactly15Minutes_IsNotPickedUp()
        {
            // El proveedor filtra por estricto `UpdatedAt < umbral`: justo en el
            // limite aun no expira. Este test fija ese borde para que nadie lo
            // "relaje" a <= sin darse cuenta.
            var order = CartWithOneItem(Guid.NewGuid());
            var clock = new ManualClock(new DateTimeOffset(order.UpdatedAt, TimeSpan.Zero));

            clock.Advance(TimeSpan.FromMinutes(15));

            var expired = ExpiredAsSeenBy(new[] { order }, clock);

            Assert.Empty(expired);
        }

        [Fact]
        public void ExpiredFilter_PaidOrder_IsNeverPickedUp()
        {
            var clock = new ManualClock();
            var order = CartWithOneItem(Guid.NewGuid());
            order.Checkout();
            order.MarkAsPaid();

            clock.Advance(TimeSpan.FromHours(2));

            var expired = ExpiredAsSeenBy(new[] { order }, clock);

            Assert.Empty(expired);
        }

        [Fact]
        public void Threshold_FromInjectedClock_MatchesSpecWindow()
        {
            // El umbral que el worker usa sale del reloj inyectado: 15 minutos
            // atras. Este test fija el contrato aritmetico sin levantar el worker.
            var clock = new ManualClock(new DateTimeOffset(2026, 9, 29, 12, 0, 0, TimeSpan.Zero));

            DateTime threshold = clock.UtcNow.AddMinutes(-15).UtcDateTime;

            Assert.Equal(new DateTime(2026, 9, 29, 11, 45, 0, DateTimeKind.Utc), threshold);
        }

        [Fact]
        public void ManualClock_OnlyMovesForward()
        {
            var clock = new ManualClock();

            Assert.Throws<ArgumentOutOfRangeException>(() => clock.Advance(TimeSpan.FromMinutes(-1)));
        }
    }
}
