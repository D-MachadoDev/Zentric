using System;
using System.Runtime.CompilerServices;
using Zentric.Domain.Users;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class SellerPayoutMapper
    {
        public static SellerPayout ToDomain(SellerPayoutDbModel dbModel)
        {
            var payout = (SellerPayout)RuntimeHelpers.GetUninitializedObject(typeof(SellerPayout));

            typeof(SellerPayout).GetProperty("Id")?.SetValue(payout, dbModel.Id);
            typeof(SellerPayout).GetProperty("SellerId")?.SetValue(payout, dbModel.SellerId);
            typeof(SellerPayout).GetProperty("Amount")?.SetValue(payout, dbModel.Amount);
            typeof(SellerPayout).GetProperty("Currency")?.SetValue(payout, dbModel.Currency);
            typeof(SellerPayout).GetProperty("Status")?.SetValue(payout, dbModel.Status);
            typeof(SellerPayout).GetProperty("BankSummary")?.SetValue(payout, dbModel.BankSummary);
            typeof(SellerPayout).GetProperty("ReferenceNumber")?.SetValue(payout, dbModel.ReferenceNumber);
            typeof(SellerPayout).GetProperty("RequestedAt")?.SetValue(payout, dbModel.RequestedAt);
            typeof(SellerPayout).GetProperty("ProcessedAt")?.SetValue(payout, dbModel.ProcessedAt);

            return payout;
        }

        public static SellerPayoutDbModel ToDbModel(SellerPayout domain)
        {
            return new SellerPayoutDbModel
            {
                Id = domain.Id,
                SellerId = domain.SellerId,
                Amount = domain.Amount,
                Currency = domain.Currency,
                Status = domain.Status,
                BankSummary = domain.BankSummary,
                ReferenceNumber = domain.ReferenceNumber,
                RequestedAt = domain.RequestedAt,
                ProcessedAt = domain.ProcessedAt
            };
        }
    }
}
