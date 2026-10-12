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

            // La hidratacion ocurre por reflexion sobre un objeto sin ctor, de modo
            // que la lista queda en null (ver PaymentReceipt._credits). Se rellena
            // aqui, no en el dominio: solo el mapper sabe que el objeto no se
            // construyo por su ctor normal.
            var credits = GetCredits(receipt);
            foreach (var creditDb in dbModel.Credits)
            {
                credits.Add(new RefundCredit(
                    paymentReceiptId: creditDb.PaymentReceiptId,
                    returnRequestId: creditDb.ReturnRequestId,
                    customerOrderId: creditDb.CustomerOrderId,
                    orderItemId: creditDb.OrderItemId,
                    variantId: creditDb.VariantId,
                    quantity: creditDb.Quantity,
                    amount: new Money(creditDb.Amount.Amount, creditDb.Amount.Currency),
                    ruleApplied: creditDb.RuleApplied,
                    actorId: creditDb.ActorId,
                    occurredAt: creditDb.OccurredAt));
            }

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
                },
                Credits = domain.Credits.Select(c => new RefundCreditDbModel
                {
                    Id = c.Id,
                    PaymentReceiptId = c.PaymentReceiptId,
                    ReturnRequestId = c.ReturnRequestId,
                    CustomerOrderId = c.CustomerOrderId,
                    OrderItemId = c.OrderItemId,
                    VariantId = c.VariantId,
                    Quantity = c.Quantity,
                    Amount = new MoneyDbModel { Amount = c.Amount.Amount, Currency = c.Amount.Currency },
                    RuleApplied = c.RuleApplied,
                    ActorId = c.ActorId,
                    OccurredAt = c.OccurredAt
                }).ToList()
            };
        }

        private static void Set(Type type, object target, string property, object? value)
            => type.GetProperty(property)?.SetValue(target, value);

        /// <summary>
        /// Devuelve la lista interna de creditos del agregado. En un objeto creado
        /// normalmente viene con una lista ya; en uno hidratado por reflexion viene
        /// en null y se crea aqui. Se usa reflexion sobre el CAMPO privado porque
        /// la propiedad publica <c>Credits</c> es solo de lectura.
        /// </summary>
        private static List<RefundCredit> GetCredits(object receipt)
        {
            var field = typeof(PaymentReceipt).GetField(
                "_credits", BindingFlags.Instance | BindingFlags.NonPublic);

            if (field?.GetValue(receipt) is not List<RefundCredit> existing)
            {
                existing = new List<RefundCredit>();
                field?.SetValue(receipt, existing);
            }

            return existing;
        }
    }
}