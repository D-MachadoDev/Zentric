using System;
using System.Collections.Generic;
using Zentric.Domain.Orders.Enums;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class CustomerOrderDbModel
    {
        public Guid Id { get; set; }
        public Guid BuyerId { get; set; }
        public OrderStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public ICollection<OrderItemDbModel> Items { get; set; } = new List<OrderItemDbModel>();
    }

    public class OrderItemDbModel
    {
        public Guid Id { get; set; }
        public Guid CustomerOrderId { get; set; }
        public Guid VariantId { get; set; }

        /// <summary>
        /// Instantanea historica del vendedor (Q-18). No se recalcula contra
        /// el producto: la factura refleja quien vendio en la compra.
        /// </summary>
        public Guid VendorId { get; set; }

        public int Quantity { get; set; }
        public MoneyDbModel UnitPrice { get; set; } = null!;
        public CustomerOrderDbModel CustomerOrder { get; set; } = null!;
    }
}
