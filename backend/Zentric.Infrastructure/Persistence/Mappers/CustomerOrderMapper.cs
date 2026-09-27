using System;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Entities;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class CustomerOrderMapper
    {
        public static CustomerOrder ToDomain(CustomerOrderDbModel dbModel)
        {
            var order = (CustomerOrder)RuntimeHelpers.GetUninitializedObject(typeof(CustomerOrder));
            
            typeof(CustomerOrder).GetProperty("Id")?.SetValue(order, dbModel.Id);
            typeof(CustomerOrder).GetProperty("BuyerId")?.SetValue(order, dbModel.BuyerId);
            typeof(CustomerOrder).GetProperty("Status")?.SetValue(order, dbModel.Status);
            typeof(CustomerOrder).GetProperty("CreatedAt")?.SetValue(order, dbModel.CreatedAt);
            typeof(CustomerOrder).GetProperty("UpdatedAt")?.SetValue(order, dbModel.UpdatedAt);

            var itemsField = typeof(CustomerOrder).GetField("_items", BindingFlags.NonPublic | BindingFlags.Instance);
            var itemsList = new System.Collections.Generic.List<OrderItem>();
            if (dbModel.Items != null)
            {
                foreach (var itemDb in dbModel.Items)
                {
                    var item = (OrderItem)RuntimeHelpers.GetUninitializedObject(typeof(OrderItem));
                    typeof(OrderItem).GetProperty("Id")?.SetValue(item, itemDb.Id);
                    typeof(OrderItem).GetProperty("CustomerOrderId")?.SetValue(item, itemDb.CustomerOrderId);
                    typeof(OrderItem).GetProperty("VariantId")?.SetValue(item, itemDb.VariantId);
                    typeof(OrderItem).GetProperty("Quantity")?.SetValue(item, itemDb.Quantity);
                    typeof(OrderItem).GetProperty("UnitPrice")?.SetValue(item, new Money(itemDb.UnitPrice.Amount, itemDb.UnitPrice.Currency));
                    itemsList.Add(item);
                }
            }
            itemsField?.SetValue(order, itemsList);
            return order;
        }

        public static CustomerOrderDbModel ToDbModel(CustomerOrder domain)
        {
            var dbModel = new CustomerOrderDbModel
            {
                Id = domain.Id,
                BuyerId = domain.BuyerId,
                Status = domain.Status,
                CreatedAt = domain.CreatedAt,
                UpdatedAt = domain.UpdatedAt
            };

            foreach (var item in domain.Items)
            {
                dbModel.Items.Add(new OrderItemDbModel
                {
                    Id = item.Id,
                    CustomerOrderId = item.CustomerOrderId,
                    VariantId = item.VariantId,
                    Quantity = item.Quantity,
                    UnitPrice = new MoneyDbModel { Amount = item.UnitPrice.Amount, Currency = item.UnitPrice.Currency }
                });
            }
            return dbModel;
        }
    }
}
