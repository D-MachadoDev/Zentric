using System.Reflection;
using System.Runtime.CompilerServices;
using Zentric.Domain.Users;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class SellerProfileMapper
    {
        public static SellerProfile ToDomain(SellerProfileDbModel dbModel)
        {
            var profile = (SellerProfile)RuntimeHelpers.GetUninitializedObject(typeof(SellerProfile));

            typeof(SellerProfile).GetProperty("Id")?.SetValue(profile, dbModel.Id);
            typeof(SellerProfile).GetProperty("UserId")?.SetValue(profile, dbModel.UserId);
            typeof(SellerProfile).GetProperty("StoreName")?.SetValue(profile, dbModel.StoreName);
            typeof(SellerProfile).GetProperty("LogoUrl")?.SetValue(profile, dbModel.LogoUrl);
            typeof(SellerProfile).GetProperty("IsVerified")?.SetValue(profile, dbModel.IsVerified);
            typeof(SellerProfile).GetProperty("CreatedAt")?.SetValue(profile, dbModel.CreatedAt);
            typeof(SellerProfile).GetProperty("UpdatedAt")?.SetValue(profile, dbModel.UpdatedAt);

            return profile;
        }

        public static SellerProfileDbModel ToDbModel(SellerProfile domain)
        {
            return new SellerProfileDbModel
            {
                Id = domain.Id,
                UserId = domain.UserId,
                StoreName = domain.StoreName,
                LogoUrl = domain.LogoUrl,
                IsVerified = domain.IsVerified,
                CreatedAt = domain.CreatedAt,
                UpdatedAt = domain.UpdatedAt
            };
        }
    }
}
