using System;
using System.Reflection;
using System.Runtime.CompilerServices;
using Zentric.Domain.Buyers;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class BuyerMapper
    {
        public static Buyer ToDomain(BuyerDbModel dbModel)
        {
            var buyer = (Buyer)RuntimeHelpers.GetUninitializedObject(typeof(Buyer));
            
            typeof(Buyer).GetProperty("UserId")?.SetValue(buyer, dbModel.UserId);
            typeof(Buyer).GetProperty("MainAddress")?.SetValue(buyer, dbModel.MainAddress);
            typeof(Buyer).GetProperty("IsActiveForCommerce")?.SetValue(buyer, dbModel.IsActiveForCommerce);
            typeof(Buyer).GetProperty("CreatedAt")?.SetValue(buyer, dbModel.CreatedAt);
            typeof(Buyer).GetProperty("UpdatedAt")?.SetValue(buyer, dbModel.UpdatedAt);

            return buyer;
        }

        public static BuyerDbModel ToDbModel(Buyer domain)
        {
            return new BuyerDbModel
            {
                UserId = domain.UserId,
                MainAddress = domain.MainAddress,
                IsActiveForCommerce = domain.IsActiveForCommerce,
                CreatedAt = domain.CreatedAt,
                UpdatedAt = domain.UpdatedAt
            };
        }
    }
}
