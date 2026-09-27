using System;
using System.Reflection;
using System.Runtime.CompilerServices;
using Zentric.Domain.Payments;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class PaymentReceiptMapper
    {
        public static PaymentReceipt ToDomain(PaymentReceiptDbModel dbModel)
        {
            // El agregado no tiene constructor publico: se instancia sin ejecutar
            // el ctor y se hidrata por reflexion, igual que InvoiceMapper.
            var receipt = (PaymentReceipt)RuntimeHelpers.GetUninitializedObject(typeof(PaymentReceipt));

            Set(typeof(PaymentReceipt), receipt, "Id", dbModel.Id);
            Set(typeof(PaymentReceipt), receipt, "OrderId", dbModel.OrderId);
            Set(typeof(PaymentReceipt), receipt, "Status", dbModel.Status);
            Set(typeof(PaymentReceipt), receipt, "TransactionId", dbModel.TransactionId);
            Set(typeof(PaymentReceipt), receipt, "CreatedAt", dbModel.CreatedAt);
            Set(typeof(PaymentReceipt), receipt, "RefundedAt", dbModel.RefundedAt);
            Set(typeof(PaymentReceipt), receipt, "Amount",
                new Money(dbModel.Amount.Amount, dbModel.Amount.Currency));
            Set(typeof(PaymentReceipt), receipt, "RefundedAmount",
                new Money(dbModel.RefundedAmount.Amount, dbModel.RefundedAmount.Currency));

            return receipt;
        }

        public static PaymentReceiptDbModel ToDbModel(PaymentReceipt domain)
        {
            return new PaymentReceiptDbModel
            {
                Id = domain.Id,
                OrderId = domain.OrderId,
                Status = domain.Status,
                TransactionId = domain.TransactionId,
                CreatedAt = domain.CreatedAt,
                RefundedAt = domain.RefundedAt,
                Amount = new MoneyDbModel { Amount = domain.Amount.Amount, Currency = domain.Amount.Currency },
                RefundedAmount = new MoneyDbModel
                {
                    Amount = domain.RefundedAmount.Amount,
                    Currency = domain.RefundedAmount.Currency
                }
            };
        }

        private static void Set(Type type, object target, string property, object? value)
            => type.GetProperty(property)?.SetValue(target, value);
    }
}