using System;

namespace Zentric.Api.Contracts
{
    public record UpdateSellerProfileRequest(
        string StoreName,
        string? LogoUrl = null);

    public record SellerProfileDto(
        Guid Id,
        Guid UserId,
        string StoreName,
        string? LogoUrl,
        bool IsVerified,
        DateTime CreatedAt,
        DateTime UpdatedAt);
}
