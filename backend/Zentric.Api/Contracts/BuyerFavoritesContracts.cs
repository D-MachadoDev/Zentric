using System;

namespace Zentric.Api.Contracts
{
    /// <summary>
    /// Petición para agregar un producto a la lista de favoritos del comprador.
    /// </summary>
    public record AddBuyerFavoriteRequest(Guid ProductId);

    /// <summary>
    /// Proyección de un producto favorito enriquecido con metadatos comerciales para el Drawer y vistas de cliente.
    /// </summary>
    public record BuyerFavoriteItemDto(
        Guid Id,
        Guid ProductId,
        string ProductName,
        decimal Price,
        string Currency,
        string? ImageUrl,
        int AvailableQuantity,
        decimal AverageRating,
        int ReviewsCount,
        DateTime CreatedAt);
}
