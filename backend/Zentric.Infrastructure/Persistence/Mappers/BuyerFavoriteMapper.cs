using System;
using System.Runtime.CompilerServices;
using Zentric.Domain.Buyers;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class BuyerFavoriteMapper
    {
        public static BuyerFavorite ToDomain(BuyerFavoriteDbModel dbModel)
        {
            var favorite = (BuyerFavorite)RuntimeHelpers.GetUninitializedObject(typeof(BuyerFavorite));

            typeof(BuyerFavorite).GetProperty("Id")?.SetValue(favorite, dbModel.Id);
            typeof(BuyerFavorite).GetProperty("UserId")?.SetValue(favorite, dbModel.UserId);
            typeof(BuyerFavorite).GetProperty("ProductId")?.SetValue(favorite, dbModel.ProductId);
            typeof(BuyerFavorite).GetProperty("CreatedAt")?.SetValue(favorite, dbModel.CreatedAt);

            return favorite;
        }

        public static BuyerFavoriteDbModel ToDbModel(BuyerFavorite domain)
        {
            return new BuyerFavoriteDbModel
            {
                Id = domain.Id,
                UserId = domain.UserId,
                ProductId = domain.ProductId,
                CreatedAt = domain.CreatedAt
            };
        }
    }
}
