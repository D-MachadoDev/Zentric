using System;

namespace Zentric.Domain.Users
{
    public sealed class SellerProfile
    {
        public Guid Id { get; init; }
        public Guid UserId { get; private set; }
        public string StoreName { get; private set; }
        public string? LogoUrl { get; private set; }
        public bool IsVerified { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }

        private SellerProfile()
        {
            StoreName = null!;
        } // For EF Core

        public SellerProfile(Guid userId, string storeName, string? logoUrl = null, bool isVerified = false)
        {
            if (userId == Guid.Empty)
            {
                throw new ArgumentException("User ID cannot be empty.", nameof(userId));
            }

            if (string.IsNullOrWhiteSpace(storeName))
            {
                throw new ArgumentException("Store name cannot be empty.", nameof(storeName));
            }

            if (storeName.Trim().Length > 150)
            {
                throw new ArgumentException("Store name cannot exceed 150 characters.", nameof(storeName));
            }

            Id = Guid.NewGuid();
            UserId = userId;
            StoreName = storeName.Trim();
            LogoUrl = string.IsNullOrWhiteSpace(logoUrl) ? null : logoUrl.Trim();
            IsVerified = isVerified;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
        }

        public void Verify()
        {
            IsVerified = true;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Unverify()
        {
            IsVerified = false;
            UpdatedAt = DateTime.UtcNow;
        }

        public void UpdateProfile(string storeName, string? logoUrl)
        {
            if (string.IsNullOrWhiteSpace(storeName))
            {
                throw new ArgumentException("Store name cannot be empty.", nameof(storeName));
            }

            if (storeName.Trim().Length > 150)
            {
                throw new ArgumentException("Store name cannot exceed 150 characters.", nameof(storeName));
            }

            StoreName = storeName.Trim();
            LogoUrl = string.IsNullOrWhiteSpace(logoUrl) ? null : logoUrl.Trim();
            UpdatedAt = DateTime.UtcNow;
        }
    }
}
