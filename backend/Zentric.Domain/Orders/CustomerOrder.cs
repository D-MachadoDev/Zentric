using Zentric.Domain.Orders.Entities;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Orders
{
    public sealed class CustomerOrder : Zentric.Domain.Common.Models.Entity
    {
        public Guid Id { get; init; }
        public Guid BuyerId { get; private set; }
        public OrderStatus Status { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }

        private readonly List<OrderItem> _items = new();
        public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();

        public Money TotalAmount
        {
            get
            {
                if (_items.Count == 0)
                {
                    return new Money(0, "USD"); // Por defecto o manejar divisa
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
                throw new ArgumentException("Buyer ID is required.", nameof(buyerId));

            Id = Guid.NewGuid();
            BuyerId = buyerId;
            Status = OrderStatus.Cart; // Estado inicial según ZENTRIC.md Dominio 7
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
        }

        public void AddItem(Guid variantId, int quantity, Money unitPrice)
        {
            EnsureNotDelivered();
            
            if (Status != OrderStatus.Cart)
            {
                throw new InvalidOperationException("Can only add items while the order is in the Cart status.");
            }

            var existingItem = _items.SingleOrDefault(i => i.VariantId == variantId);
            if (existingItem != null)
            {
                existingItem.AddQuantity(quantity);
            }
            else
            {
                _items.Add(new OrderItem(Id, variantId, quantity, unitPrice));
            }
            
            UpdatedAt = DateTime.UtcNow;
        }

        public void RemoveItem(Guid variantId)
        {
            EnsureNotDelivered();

            if (Status != OrderStatus.Cart)
            {
                throw new InvalidOperationException("Can only remove items while the order is in the Cart status.");
            }

            var existingItem = _items.SingleOrDefault(i => i.VariantId == variantId);
            if (existingItem == null)
            {
                throw new InvalidOperationException("Item not found in cart.");
            }

            _items.Remove(existingItem);
            UpdatedAt = DateTime.UtcNow;
        }

        public void Checkout()
        {
            EnsureNotDelivered();

            if (Status != OrderStatus.Cart)
            {
                throw new InvalidOperationException("Only an order in Cart status can be checked out.");
            }

            if (_items.Count == 0)
            {
                throw new InvalidOperationException("Cannot checkout an empty cart.");
            }

            if (DateTime.UtcNow - CreatedAt > TimeSpan.FromMinutes(15))
            {
                throw new InvalidOperationException("Cart reservation has expired (15-minute timeout).");
            }

            Status = OrderStatus.PendingPayment;
            UpdatedAt = DateTime.UtcNow;

            AddDomainEvent(new Zentric.Domain.Orders.Events.OrderCreatedDomainEvent(Id, TotalAmount.Amount, _items.ToList()));
        }

        public void MarkAsPaid()
        {
            EnsureNotDelivered();

            if (Status != OrderStatus.PendingPayment)
            {
                throw new InvalidOperationException("Order must be in PendingPayment status to be paid.");
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
                throw new InvalidOperationException("Order must be paid before being dispatched.");
            }

            Status = OrderStatus.Dispatched;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Deliver()
        {
            EnsureNotDelivered();

            if (Status != OrderStatus.Dispatched)
            {
                throw new InvalidOperationException("Order must be dispatched before being delivered.");
            }

            Status = OrderStatus.Delivered;
            UpdatedAt = DateTime.UtcNow;
        }

        public void CancelDueToTimeout()
        {
            EnsureNotDelivered();

            if (Status != OrderStatus.Cart && Status != OrderStatus.PendingPayment)
            {
                throw new InvalidOperationException("Only an order in Cart or PendingPayment status can be cancelled due to timeout.");
            }

            Status = OrderStatus.Cancelled;
            UpdatedAt = DateTime.UtcNow;
        }

        private void EnsureNotDelivered()
        {
            // Regla de Negocio SSoT: Un pedido en estado Delivered o Cancelled no podrá ser modificado bajo ninguna circunstancia.
            if (Status == OrderStatus.Delivered)
            {
                throw new InvalidOperationException("A delivered order cannot be modified under any circumstances.");
            }
            if (Status == OrderStatus.Cancelled)
            {
                throw new InvalidOperationException("A cancelled order cannot be modified under any circumstances.");
            }
        }
    }
}

