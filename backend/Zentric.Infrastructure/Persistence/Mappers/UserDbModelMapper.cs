using Zentric.Domain.Users;
using Zentric.Domain.Users.ValueObjects;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class UserDbModelMapper
    {
        public static User ToDomain(UserDbModel dbModel)
        {
            var user = new User(
                dbModel.IdentityDocument,
                new FullName(dbModel.FirstName, dbModel.LastName),
                new Email(dbModel.Email),
                dbModel.PasswordHash,
                dbModel.Role
            );

            // Reflection to set internal state
            var idProp = typeof(User).GetProperty("Id");
            idProp?.SetValue(user, dbModel.Id);

            var statusProp = typeof(User).GetProperty("Status");
            statusProp?.SetValue(user, dbModel.Status);

            var createdAtProp = typeof(User).GetProperty("CreatedAt");
            createdAtProp?.SetValue(user, dbModel.CreatedAt);

            var updatedAtProp = typeof(User).GetProperty("UpdatedAt");
            updatedAtProp?.SetValue(user, dbModel.UpdatedAt);

            var deletedAtProp = typeof(User).GetProperty("DeletedAt");
            deletedAtProp?.SetValue(user, dbModel.DeletedAt);

            return user;
        }

        public static UserDbModel ToDbModel(User domain)
        {
            return new UserDbModel
            {
                Id = domain.Id,
                IdentityDocument = domain.IdentityDocument,
                FirstName = domain.FullName.FirstName,
                LastName = domain.FullName.LastName,
                Email = domain.Email.Value,
                PasswordHash = domain.PasswordHash,
                Role = domain.Role,
                Status = domain.Status,
                CreatedAt = domain.CreatedAt,
                UpdatedAt = domain.UpdatedAt,
                DeletedAt = domain.DeletedAt
            };
        }
    }
}
