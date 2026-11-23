using Zentric.Domain.Orders.Entities;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Orders
{
    public sealed class CustomerOrder : Zentric.Domain.Common.Models.Entity
    {
        /// <summary>
        /// Moneda por defecto del sistema, usada solo cuando el carrito esta vacio
        /// y, por tanto, no hay ninguna moneda de referencia que inferir.
        /// Cuando el carrito tiene items, el total adopta la moneda del primero.
        /// El sistema es multi-moneda: cada operacion conserva la que se le pasa.
        /// </summary>
        public const string DefaultCurrency = "COP";

        public Guid Id { get; init; }
        public Guid BuyerId { get; private set; }
        public OrderStatus Status { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }
        
        /// <summary>
        /// Momento en que se inició el checkout (transición Cart → PendingPayment).
        /// Null hasta que se llama a <see cref="Checkout()"/>.
        /// La ventana de 15 minutos se computa desde este instante, no desde <see cref="CreatedAt"/>.
        /// </summary>
        public DateTime? CheckoutStartedAt { get; private set; }

        /// <summary>
        /// Causa de cancelacion del pedido para diferenciar caducidad de liquidacion.
        /// </summary>
        public OrderCancellationCause? CancellationCause { get; private set; }

        /// <summary>
        /// Detalle libre del motivo. NO sustituye a <see cref="CancellationCause"/>:
        /// el texto explica, el tipo identifica.
        /// </summary>
        public string? CancellationReason { get; private set; }

        private readonly List<OrderItem> _items = new();
        public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();

        private readonly List<DigitalDeliveryRecord> _digitalDeliveries = new();
        public IReadOnlyCollection<DigitalDeliveryRecord> DigitalDeliveries => _digitalDeliveries.AsReadOnly();

        public Money TotalAmount
        {
            get
            {
                if (_items.Count == 0)
                {
                    // Carrito sin items: el total es cero y no hay una moneda de
                    // referencia propia. Se usa la moneda por defecto del sistema.
                    return new Money(0, DefaultCurrency);
                }

                var firstCurrency = _items.First().UnitPrice.Currency;
                var total = new Money(0, firstCurrency);
                foreach (var item in _items)
                {
                    total = total.Add(item.TotalPrice);
                }
                return total;
            }
        }

        private CustomerOrder()
        {
            // For EF Core
        }

        public CustomerOrder(Guid buyerId)
        {
            if (buyerId == Guid.Empty)
                throw new ArgumentException("El identificador del comprador es obligatorio.", nameof(buyerId));

            Id = Guid.NewGuid();
            BuyerId = buyerId;
            Status = OrderStatus.Cart; // Estado inicial según ZENTRIC.md Dominio 7
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
        }

        public void AddItem(Guid variantId, Guid vendorId, int quantity, Money unitPrice)
        {
            EnsureNotDelivered();
            
            if (Status != OrderStatus.Cart)
            {
                throw new InvalidOperationException("Solo se pueden agregar artículos mientras el pedido está en estado Cart.");
            }

            var existingItem = _items.SingleOrDefault(i => i.VariantId == variantId);

            if (existingItem != null)
            {
                existingItem.AddQuantity(quantity);
                UpdatedAt = DateTime.UtcNow;
                return;
            }

            _items.Add(new OrderItem(Id, variantId, vendorId, quantity, unitPrice));
            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Removes an item from the cart by its variant ID.
        /// </summary>
        /// <param name="variantId">The variant ID of the item to remove.</param>
        /// <exception cref="InvalidOperationException">
        /// Thrown when the order is not in Cart status, or when the item does not exist in the cart.
        /// </exception>
        public void RemoveItem(Guid variantId)
        {
            EnsureNotDelivered();

            if (Status != OrderStatus.Cart)
            {
                throw new InvalidOperationException("Solo se pueden eliminar artículos mientras el pedido está en estado Cart.");
            }

            var itemToRemove = _items.SingleOrDefault(i => i.VariantId == variantId);
            if (itemToRemove == null)
            {
                throw new InvalidOperationException("Artículo no encontrado en el carrito");
            }

            _items.Remove(itemToRemove);
            UpdatedAt = DateTime.UtcNow;

            // Per decision P2: empty cart remains in Cart status (navigable)
            // Per decision P3: no domain event emitted on item removal
        }

        /// <summary>
        /// Actualiza la cantidad de una línea del carrito.
        /// </summary>
        /// <param name="variantId">El VariantId de la línea a actualizar.</param>
        /// <param name="quantity">La nueva cantidad (debe ser >= 1).</param>
        /// <exception cref="InvalidOperationException">
        /// Se lanza si el pedido no está en estado Cart, si la línea no existe,
        /// o si la cantidad es menor a 1.
        /// </exception>
        public void UpdateItemQuantity(Guid variantId, int quantity)
        {
            EnsureNotDelivered();

            if (Status != OrderStatus.Cart)
            {
                throw new InvalidOperationException("Solo se pueden actualizar las cantidades de los artículos mientras el pedido está en estado Cart.");
            }

            if (quantity < 1)
            {
                throw new InvalidOperationException("La cantidad debe ser al menos 1. Use RemoveItem para eliminar la línea por completo.");
            }

            var item = _items.SingleOrDefault(i => i.VariantId == variantId);
            if (item == null)
            {
                throw new InvalidOperationException("Artículo no encontrado en el carrito");
            }

            item.UpdateQuantity(quantity);
            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Registra la entrega de un producto digital (CA).
        /// Se invoca desde el handler de pago cuando este es aprobado.
        /// </summary>
        public void AddDigitalDelivery(DigitalDeliveryRecord record)
        {
            ArgumentNullException.ThrowIfNull(record);

            // La entrega digital solo tiene sentido en pedidos pagados
            if (Status != OrderStatus.Paid)
            {
                throw new InvalidOperationException("La entrega digital solo se puede registrar para pedidos pagados.");
            }

            _digitalDeliveries.Add(record);
            UpdatedAt = DateTime.UtcNow;
        }

        public void Checkout()
        {
            EnsureNotDelivered();

            if (Status != OrderStatus.Cart)
            {
                throw new InvalidOperationException("Solo un pedido en estado Cart puede iniciar el pago.");
            }

            if (_items.Count == 0)
            {
                throw new InvalidOperationException("No se puede iniciar el pago de un carrito vacío.");
            }

            // (/): la caducidad es una regla de negocio y vive aqui, no
            // en el lector del carrito. La ventana reglamentaria dura 15 minutos:
            // el umbral lo calcula quien llama con un IClock (ver
            // CheckoutTimeoutService) y Checkout solo decide si ya expiro con el
            // instante que el propio agregado conoce. Asi la caducidad se
            // comprueba moviendo el reloj, no la suite.
            //
            // FIX: El timeout de 15 minutos empieza en el momento del checkout,
            // no en la creación del carrito (CreatedAt).
            CheckoutStartedAt = DateTime.UtcNow;

            if (DateTime.UtcNow - CheckoutStartedAt.Value > TimeSpan.FromMinutes(15))
            {
                throw new InvalidOperationException("La reserva del carrito ha expirado (tiempo de espera de 15 minutos).");
            }

            Status = OrderStatus.PendingPayment;
            UpdatedAt = DateTime.UtcNow;

            AddDomainEvent(new Zentric.Domain.Orders.Events.OrderCreatedDomainEvent(Id, TotalAmount.Amount, _items.ToList()));
        }

        public void RenewReservation()
        {
            EnsureNotDelivered();

            if (Status != OrderStatus.PendingPayment)
            {
                throw new InvalidOperationException("Solo un pedido en estado PendingPayment puede renovar su reserva.");
            }

            CheckoutStartedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
        }

        public void MarkAsPaid()
        {
            EnsureNotDelivered();

            if (Status != OrderStatus.PendingPayment)
            {
                throw new InvalidOperationException("El pedido debe estar en estado PendingPayment para ser pagado.");
            }

            Status = OrderStatus.Paid;
            UpdatedAt = DateTime.UtcNow;

            AddDomainEvent(new Zentric.Domain.Orders.Events.OrderPaidDomainEvent(Id));
        }

        public void Dispatch()
        {
            EnsureNotDelivered();

            if (Status != OrderStatus.Paid)
            {
                throw new InvalidOperationException("El pedido debe estar pagado antes de ser despachado.");
            }

            Status = OrderStatus.Dispatched;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Deliver()
        {
            EnsureNotDelivered();

            if (Status != OrderStatus.Dispatched)
            {
                throw new InvalidOperationException("El pedido debe estar despachado antes de ser entregado.");
            }

            Status = OrderStatus.Delivered;
            UpdatedAt = DateTime.UtcNow;
        }

        public void CancelDueToTimeout()
        {
            CancelFor(OrderCancellationCause.PaymentTimeout, "Checkout reservation expired.");
        }

        public void CancelByBuyer()
        {
            CancelFor(OrderCancellationCause.PaymentTimeout, "Cancelled by buyer.");
        }

        /// <summary>
        /// ADun pedido totalmente resuelto pasa a <c>Cancelled</c>.
        ///
        /// No es lo mismo que "entregado": no llego nada y el dinero volvio entero.
        /// Por eso el estado es <c>Cancelled</c> y no <c>Delivered</c> (decision 3).
        ///
        /// La precondicion es de DOS condiciones a la vez (decision 4): todos los
        /// despachos cancelados POR y el comprobante con credito acumulado
        /// igual a lo cobrado (invariante 14). Con una sola el pedido mentiria:
        /// cancelado con dinero sin devolver sigue siendo un debe, y acreditado con
        /// algo por entregar no esta resuelto.
        /// </summary>
        /// <param name="areAllFulfillmentsCancelled">
        /// true solo si TODOS los despachos del pedido estan en <c>Cancelled</c>.
        /// Una cancelacion parcial no resuelve el pedido: sigue habiendo entrega.
        /// </param>
        /// <param name="isReceiptFullyRefunded">
        /// true solo si el acumulado del comprobante iguala el total cobrado.
        /// </param>
        public void ResolveFully(bool areAllFulfillmentsCancelled, bool isReceiptFullyRefunded)
        {
            EnsureNotDelivered();

            // Ya resuelto: idempotente. Reevaluar la precondicion tras cada
            // reembolso debe poder ejecutarse muchas veces sin fallar.
            if (Status == OrderStatus.Cancelled && CancellationCause == OrderCancellationCause.FullyResolved)
            {
                return;
            }

            if (Status == OrderStatus.Delivered)
            {
                throw new InvalidOperationException("Un pedido entregado no puede resolverse como cancelado.");
            }

            if (!areAllFulfillmentsCancelled)
            {
                throw new InvalidOperationException(
                    "Un pedido solo puede resolverse por completo cuando todos sus despachos están cancelados.");
            }

            if (!isReceiptFullyRefunded)
            {
                throw new InvalidOperationException(
                    "Un pedido solo puede resolverse por completo una vez que su comprobante de pago ha sido reembolsado en su totalidad.");
            }

            Status = OrderStatus.Cancelled;
            CancellationCause = OrderCancellationCause.FullyResolved;
            CancellationReason = "All fulfillments cancelled and the buyer was refunded in full.";
            UpdatedAt = DateTime.UtcNow;
        }

        private void CancelFor(OrderCancellationCause cause, string reason)
        {
            EnsureNotDelivered();

            if (Status != OrderStatus.Cart && Status != OrderStatus.PendingPayment)
            {
                throw new InvalidOperationException("Solo un pedido en estado Cart o PendingPayment puede cancelarse por tiempo de espera.");
            }

            Status = OrderStatus.Cancelled;
            CancellationCause = cause;
            CancellationReason = reason;
            UpdatedAt = DateTime.UtcNow;
        }

        private void EnsureNotDelivered()
        {
            // Regla de Negocio SSoT: Un pedido en estado Delivered o Cancelled no podrá ser modificado bajo ninguna circunstancia.
            if (Status == OrderStatus.Delivered)
            {
                throw new InvalidOperationException("Un pedido entregado no puede modificarse bajo ninguna circunstancia.");
            }
            if (Status == OrderStatus.Cancelled)
            {
                throw new InvalidOperationException("Un pedido cancelado no puede modificarse bajo ninguna circunstancia.");
            }
        }
    }
}
