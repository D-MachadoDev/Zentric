using System;
using System.Reflection;
using System.Runtime.CompilerServices;
using Zentric.Domain.Billing;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class InvoiceMapper
    {
        public static Invoice ToDomain(InvoiceDbModel dbModel)
        {
            var inv = (Invoice)RuntimeHelpers.GetUninitializedObject(typeof(Invoice));
            
            typeof(Invoice).GetProperty("Id")?.SetValue(inv, dbModel.Id);
            typeof(Invoice).GetProperty("CustomerOrderId")?.SetValue(inv, dbModel.CustomerOrderId);
            typeof(Invoice).GetProperty("Type")?.SetValue(inv, dbModel.Type);
            typeof(Invoice).GetProperty("IssuedAt")?.SetValue(inv, dbModel.IssuedAt);
            typeof(Invoice).GetProperty("TotalAmount")?.SetValue(inv, new Money(dbModel.TotalAmount.Amount, dbModel.TotalAmount.Currency));

            return inv;
        }

        public static InvoiceDbModel ToDbModel(Invoice domain)
        {
            return new InvoiceDbModel
            {
                Id = domain.Id,
                CustomerOrderId = domain.CustomerOrderId,
                Type = domain.Type,
                IssuedAt = domain.IssuedAt,
                TotalAmount = new MoneyDbModel { Amount = domain.TotalAmount.Amount, Currency = domain.TotalAmount.Currency }
            };
        }
    }
}
