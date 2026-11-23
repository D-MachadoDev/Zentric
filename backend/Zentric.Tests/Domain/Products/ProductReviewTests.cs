using System;
using System.Collections.Generic;
using Xunit;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Domain.Products;

public sealed class ProductReviewTests
{
    private static readonly Guid SampleProductId = Guid.NewGuid();
    private static readonly Guid SampleBuyerId = Guid.NewGuid();
    private static readonly Guid SampleVendorId = Guid.NewGuid();

    /// <summary>
    /// Objetivo: Validar la instanciación correcta de ProductReview con propiedades inmutables y CreatedAtUtc.
    /// Entradas: ProductId válido, BuyerId válido, Rating 5, Comentario descriptivo.
    /// Aserción: Las propiedades coinciden y CreatedAtUtc es UTC reciente.
    /// </summary>
    [Fact(DisplayName = "1. Creación exitosa de ProductReview con calificación y comentario válido")]
    public void ProductReview_Create_SetsPropertiesAndTimestampCorrectly()
    {
        var before = DateTime.UtcNow;
        var review = new ProductReview(SampleProductId, SampleBuyerId, 5, "Excelente calidad y acabado profesional.");
        var after = DateTime.UtcNow;

        Assert.NotEqual(Guid.Empty, review.Id);
        Assert.Equal(SampleProductId, review.ProductId);
        Assert.Equal(SampleBuyerId, review.BuyerId);
        Assert.Equal(5, review.Rating);
        Assert.Equal("Excelente calidad y acabado profesional.", review.Comment);
        Assert.True(review.CreatedAtUtc >= before && review.CreatedAtUtc <= after);
    }

    /// <summary>
    /// Objetivo: Validar que un Rating fuera del rango 1 a 5 arroja ArgumentOutOfRangeException.
    /// Entradas: Calificaciones inválidas (0, 6, -1).
    /// Aserción: ArgumentOutOfRangeException con nombre del parámetro 'rating'.
    /// </summary>
    [Theory(DisplayName = "2. Calificación fuera del rango 1 a 5 lanza excepción")]
    [InlineData(0)]
    [InlineData(6)]
    [InlineData(-1)]
    public void ProductReview_InvalidRating_ThrowsArgumentOutOfRangeException(int invalidRating)
    {
        var ex = Assert.Throws<ArgumentOutOfRangeException>(() =>
            new ProductReview(SampleProductId, SampleBuyerId, invalidRating, "Comentario de prueba"));

        Assert.Equal("rating", ex.ParamName);
    }

    /// <summary>
    /// Objetivo: Validar que ProductId o BuyerId vacíos arrojan ArgumentException.
    /// Entradas: Guid.Empty en ProductId o BuyerId.
    /// Aserción: ArgumentException.
    /// </summary>
    [Fact(DisplayName = "3. Identificadores vacíos lanzan ArgumentException")]
    public void ProductReview_EmptyGuids_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new ProductReview(Guid.Empty, SampleBuyerId, 5));
        Assert.Throws<ArgumentException>(() => new ProductReview(SampleProductId, Guid.Empty, 5));
    }

    /// <summary>
    /// Objetivo: Validar que un comentario mayor a 2000 caracteres lanza ArgumentException.
    /// Entradas: String de 2001 caracteres.
    /// Aserción: ArgumentException con mensaje de longitud excedida.
    /// </summary>
    [Fact(DisplayName = "4. Comentario mayor a 2000 caracteres lanza excepción")]
    public void ProductReview_CommentExceedingLimit_ThrowsArgumentException()
    {
        var longComment = new string('a', 2001);
        Assert.Throws<ArgumentException>(() =>
            new ProductReview(SampleProductId, SampleBuyerId, 4, longComment));
    }

    /// <summary>
    /// Objetivo: Validar el cálculo estático ponderado del promedio y conteo total de un conjunto de reseñas.
    /// Entradas: Colección con calificaciones [5, 4, 5, 3]. Suma: 17 / 4 = 4.25.
    /// Aserción: Promedio 4.25 y Conteo 4.
    /// </summary>
    [Fact(DisplayName = "5. Cálculo ponderado de promedio y conteo sobre lista de reseñas")]
    public void ProductReview_CalculateRatings_ReturnsAccurateAverageAndCount()
    {
        var reviews = new List<ProductReview>
        {
            new(SampleProductId, Guid.NewGuid(), 5, "Genial"),
            new(SampleProductId, Guid.NewGuid(), 4, "Bueno"),
            new(SampleProductId, Guid.NewGuid(), 5, "Increíble"),
            new(SampleProductId, Guid.NewGuid(), 3, "Aceptable")
        };

        var (average, count) = ProductReview.CalculateRatings(reviews);

        Assert.Equal(4.25m, average);
        Assert.Equal(4, count);
    }

    /// <summary>
    /// Objetivo: Validar que una lista vacía de reseñas devuelve promedio 0 y conteo 0.
    /// Entradas: Lista vacía.
    /// Aserción: Promedio 0m y Conteo 0.
    /// </summary>
    [Fact(DisplayName = "6. Cálculo ponderado sobre lista vacía retorna promedio cero y conteo cero")]
    public void ProductReview_CalculateRatings_EmptyList_ReturnsZero()
    {
        var (average, count) = ProductReview.CalculateRatings(new List<ProductReview>());

        Assert.Equal(0m, average);
        Assert.Equal(0, count);
    }

    /// <summary>
    /// Objetivo: Validar la asignación directa y validada de métricas de calificación en la entidad Product.
    /// Entradas: Calificación 4.9m y 248 reseñas para MacBook Pro.
    /// Aserción: Product.AverageRating == 4.9m y Product.ReviewsCount == 248.
    /// </summary>
    [Fact(DisplayName = "7. Product.SetRatingMetrics actualiza métricas de catálogo de forma consistente")]
    public void Product_SetRatingMetrics_UpdatesAggregateFields()
    {
        var product = new Product(
            name: "MacBook Pro 16\"",
            description: "M3 Max profesional",
            price: new Money(14200000m, "COP"),
            vendorId: SampleVendorId,
            type: ProductType.Physical,
            variants: new[] { ("MBP16-36-1TB", (IEnumerable<VariantAttribute>)new[] { new VariantAttribute("RAM", "36GB") }) });

        product.SetRatingMetrics(4.9m, 248);

        Assert.Equal(4.9m, product.AverageRating);
        Assert.Equal(248, product.ReviewsCount);
    }

    /// <summary>
    /// Objetivo: Validar que valores fuera de rango en SetRatingMetrics lanzan ArgumentOutOfRangeException.
    /// Entradas: Rating negativo o mayor a 5, conteo negativo.
    /// Aserción: ArgumentOutOfRangeException.
    /// </summary>
    [Theory(DisplayName = "8. Métricas inválidas en Product.SetRatingMetrics lanzan ArgumentOutOfRangeException")]
    [InlineData(-0.1, 10)]
    [InlineData(5.1, 10)]
    [InlineData(4.5, -1)]
    public void Product_SetRatingMetrics_InvalidValues_ThrowsException(decimal rating, int count)
    {
        var product = new Product(
            name: "Sony XM5",
            description: "Audífonos ANC",
            price: new Money(1590000m, "COP"),
            vendorId: SampleVendorId,
            type: ProductType.Digital);

        Assert.Throws<ArgumentOutOfRangeException>(() => product.SetRatingMetrics(rating, count));
    }

    /// <summary>
    /// Objetivo: Validar que la entidad Review existente también exponga BuyerId y CreatedAtUtc para retrocompatibilidad total.
    /// Entradas: Review existente con ProductId, UserId, Rating, Comment.
    /// Aserción: review.BuyerId == review.UserId y review.CreatedAtUtc == review.CreatedAt.
    /// </summary>
    [Fact(DisplayName = "9. Entidad Review expone BuyerId y CreatedAtUtc para compatibilidad universal")]
    public void Review_ExposesBuyerIdAndCreatedAtUtc()
    {
        var review = new Review(SampleProductId, SampleBuyerId, 4, "Excelente producto");

        Assert.Equal(SampleBuyerId, review.BuyerId);
        Assert.Equal(review.CreatedAt, review.CreatedAtUtc);
    }

    /// <summary>
    /// Objetivo: Validar que ProductReview y Review acepten y preserven BuyerName e ImageUrls.
    /// Entradas: BuyerName = "Carlos Restrepo", ImageUrls con 2 URLs de fotos reales.
    /// Aserción: Se asigna el nombre del comprador y la colección inmutable de imágenes.
    /// </summary>
    [Fact(DisplayName = "10. ProductReview y Review aceptan BuyerName e ImageUrls")]
    public void ProductReview_And_Review_AcceptBuyerNameAndImageUrls()
    {
        var photos = new[] { "https://images.unsplash.com/photo-1", "https://images.unsplash.com/photo-2" };

        var productReview = new ProductReview(
            SampleProductId,
            SampleBuyerId,
            5,
            "Foto real del unboxing",
            "Carlos Restrepo",
            photos);

        Assert.Equal("Carlos Restrepo", productReview.BuyerName);
        Assert.Equal(2, productReview.ImageUrls.Count);
        Assert.Equal(photos[0], productReview.ImageUrls[0]);

        var review = new Review(
            SampleProductId,
            SampleBuyerId,
            5,
            "Foto real del unboxing",
            "Carlos Restrepo",
            photos);

        Assert.Equal("Carlos Restrepo", review.BuyerName);
        Assert.Equal(2, review.ImageUrls.Count);
        Assert.Equal(photos[0], review.ImageUrls[0]);
    }
}
