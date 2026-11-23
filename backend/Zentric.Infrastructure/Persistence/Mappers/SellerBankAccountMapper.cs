using System;
using System.Runtime.CompilerServices;
using Zentric.Domain.Users;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class SellerBankAccountMapper
    {
        public static SellerBankAccount ToDomain(SellerBankAccountDbModel dbModel)
        {
            var account = (SellerBankAccount)RuntimeHelpers.GetUninitializedObject(typeof(SellerBankAccount));

            typeof(SellerBankAccount).GetProperty("Id")?.SetValue(account, dbModel.Id);
            typeof(SellerBankAccount).GetProperty("SellerId")?.SetValue(account, dbModel.SellerId);
            typeof(SellerBankAccount).GetProperty("BankName")?.SetValue(account, dbModel.BankName);
            typeof(SellerBankAccount).GetProperty("AccountType")?.SetValue(account, dbModel.AccountType);
            typeof(SellerBankAccount).GetProperty("AccountNumber")?.SetValue(account, dbModel.AccountNumber);
            typeof(SellerBankAccount).GetProperty("AccountHolderName")?.SetValue(account, dbModel.AccountHolderName);
            typeof(SellerBankAccount).GetProperty("DocumentNumber")?.SetValue(account, dbModel.DocumentNumber);
            typeof(SellerBankAccount).GetProperty("CreatedAt")?.SetValue(account, dbModel.CreatedAt);
            typeof(SellerBankAccount).GetProperty("UpdatedAt")?.SetValue(account, dbModel.UpdatedAt);

            return account;
        }

        public static SellerBankAccountDbModel ToDbModel(SellerBankAccount domain)
        {
            return new SellerBankAccountDbModel
            {
                Id = domain.Id,
                SellerId = domain.SellerId,
                BankName = domain.BankName,
                AccountType = domain.AccountType,
                AccountNumber = domain.AccountNumber,
                AccountHolderName = domain.AccountHolderName,
                DocumentNumber = domain.DocumentNumber,
                CreatedAt = domain.CreatedAt,
                UpdatedAt = domain.UpdatedAt
            };
        }
    }
}
