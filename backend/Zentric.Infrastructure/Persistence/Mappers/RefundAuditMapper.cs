using System;
using System.Reflection;
using System.Runtime.CompilerServices;
using Zentric.Domain.Returns;
using Zentric.Domain.Users.Enums;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class RefundAuditMapper
    {
        public static RefundAudit ToDomain(RefundAuditDbModel dbModel)
        {
            var audit = (RefundAudit)RuntimeHelpers.GetUninitializedObject(typeof(RefundAudit));

            typeof(RefundAudit).GetProperty("Id")?.SetValue(audit, dbModel.Id);
            typeof(RefundAudit).GetProperty("ReturnRequestId")?.SetValue(audit, dbModel.ReturnRequestId);
            typeof(RefundAudit).GetProperty("CustomerOrderId")?.SetValue(audit, dbModel.CustomerOrderId);
            typeof(RefundAudit).GetProperty("OrderLineId")?.SetValue(audit, dbModel.OrderLineId);
            typeof(RefundAudit).GetProperty("PaymentReceiptId")?.SetValue(audit, dbModel.PaymentReceiptId);
            typeof(RefundAudit).GetProperty("RuleApplied")?.SetValue(audit, dbModel.RuleApplied);
            typeof(RefundAudit).GetProperty("DecisionType")?.SetValue(audit, dbModel.DecisionType);
            typeof(RefundAudit).GetProperty("ActorId")?.SetValue(audit, dbModel.ActorId);
            typeof(RefundAudit).GetProperty("ActorRole")?.SetValue(audit, dbModel.ActorRole);
            typeof(RefundAudit).GetProperty("Outcome")?.SetValue(audit, dbModel.Outcome);
            typeof(RefundAudit).GetProperty("ErrorMessage")?.SetValue(audit, dbModel.ErrorMessage);
            typeof(RefundAudit).GetProperty("AttemptedAmount")?.SetValue(audit, dbModel.AttemptedAmount);
            typeof(RefundAudit).GetProperty("Currency")?.SetValue(audit, dbModel.Currency);
            typeof(RefundAudit).GetProperty("OccurredAt")?.SetValue(audit, dbModel.OccurredAt);

            return audit;
        }

        public static RefundAuditDbModel ToDbModel(RefundAudit domain)
        {
            return new RefundAuditDbModel
            {
                Id = domain.Id,
                ReturnRequestId = domain.ReturnRequestId,
                CustomerOrderId = domain.CustomerOrderId,
                OrderLineId = domain.OrderLineId,
                PaymentReceiptId = domain.PaymentReceiptId,
                RuleApplied = domain.RuleApplied,
                DecisionType = domain.DecisionType,
                ActorId = domain.ActorId,
                ActorRole = domain.ActorRole,
                Outcome = domain.Outcome,
                ErrorMessage = domain.ErrorMessage,
                AttemptedAmount = domain.AttemptedAmount,
                Currency = domain.Currency,
                OccurredAt = domain.OccurredAt
            };
        }
    }
}