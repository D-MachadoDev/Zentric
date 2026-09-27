using System;
using Zentric.Domain.Users.Enums;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class UserDbModel
    {
        public Guid Id { get; set; }
        public string IdentityDocument { get; set; } = null!;
        public string FirstName { get; set; } = null!;
        public string LastName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string PasswordHash { get; set; } = null!;
        public UserRole Role { get; set; }
        public UserStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? DeletedAt { get; set; }
    }
}
