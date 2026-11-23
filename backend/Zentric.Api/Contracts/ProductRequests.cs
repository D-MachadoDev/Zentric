using System;
using System.Collections.Generic;
using Zentric.Application.Catalog.Commands;

namespace Zentric.Api.Contracts
{
    public record AddProductVariantRequest(
        string Sku,
        List<VariantAttributeDto>? Attributes = null,
        decimal? PriceAmount = null);

    public record CreateProductReviewRequest(
        int Rating,
        string? Comment = null,
        IReadOnlyList<string>? ImageUrls = null,
        string? BuyerName = null);
}
