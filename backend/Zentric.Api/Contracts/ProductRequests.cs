using System;
using System.Collections.Generic;
using Zentric.Application.Catalog.Commands;
using Zentric.Domain.Products.Enums;

namespace Zentric.Api.Contracts
{
    /// <summary>
    /// Contrato publico de alta de producto. El <c>VendorId</c> lo fija el token,
    /// asi que no viaja en el cuerpo; <c>DigitalDownloadUrl</c> es el enlace de
    /// descarga opcional que se envia por correo al comprador de un producto digital.
    /// </summary>
    public record CreateProductRequest(
        string Name,
        string Description,
        decimal PriceAmount,
        string PriceCurrency,
        ProductType Type,
        List<CreateProductVariantDto>? Variants = null,
        string? ImageUrl = null,
        string? Category = null,
        string? DigitalDownloadUrl = null);

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
