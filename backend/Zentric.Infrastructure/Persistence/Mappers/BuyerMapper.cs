using System;
using System.Reflection;
using System.Runtime.CompilerServices;
using Zentric.Domain.Buyers;
using Zentric.Domain.Buyers.ValueObjects;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class BuyerMapper
    {
        public static Buyer ToDomain(BuyerDbModel dbModel)
        {
            var buyer = (Buyer)RuntimeHelpers.GetUninitializedObject(typeof(Buyer));
            
            typeof(Buyer).GetProperty("UserId")?.SetValue(buyer, dbModel.UserId);
            typeof(Buyer).GetProperty("MainAddress")?.SetValue(buyer, ToAddress(dbModel.MainAddress));
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
                MainAddress = FromAddress(domain.MainAddress),
                IsActiveForCommerce = domain.IsActiveForCommerce,
                CreatedAt = domain.CreatedAt,
                UpdatedAt = domain.UpdatedAt
            };
        }

        // El constructor de Address valida campos obligatorios; los datos que
        // llegan de la base ya fueron validados al escribirse, asi que aqui solo
        // se reconstruye el Value Object.
        public static Address ToAddress(AddressDbModel dbModel) => new(
            dbModel.Street, dbModel.City, dbModel.State, dbModel.ZipCode, dbModel.Country);

        public static AddressDbModel FromAddress(Address address) => new()
        {
            Street = address.Street,
            City = address.City,
            State = address.State,
            ZipCode = address.ZipCode,
            Country = address.Country
        };
    }
}
