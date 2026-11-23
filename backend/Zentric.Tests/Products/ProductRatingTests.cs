using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Products;

public sealed class ProductRatingTests
{
    private static readonly Guid VendorId = Guid.NewGuid();

    private static Product CreateProduct()
        => new("Auriculares Bluetooth", "Cancelación de ruido activa", new Money(120000m, "COP"), VendorId, ProductType.Digital);

    [Fact]
    public void NewProduct_Starts_WithZeroRatingAndZeroReviews()
    {
        var product = CreateProduct();

        Assert.Equal(0m, product.AverageRating);
        Assert.Equal(0, product.ReviewsCount);
    }

    [Fact]
    public void ApplyReview_FirstReview_SetsAverageRatingAndCountToOne()
    {
        var product = CreateProduct();

        product.ApplyReview(5);

        Assert.Equal(5.00m, product.AverageRating);
        Assert.Equal(1, product.ReviewsCount);
    }

    [Fact]
    public void ApplyReview_MultipleReviews_CalculatesRunningAverageAccurately()
    {
        var product = CreateProduct();

        product.ApplyReview(5); // avg: 5.00, count: 1
        product.ApplyReview(4); // avg: 4.50, count: 2
        product.ApplyReview(3); // avg: 4.00, count: 3
        product.ApplyReview(5); // (5+4+3+5)/4 = 17/4 = 4.25, count: 4

        Assert.Equal(4.25m, product.AverageRating);
        Assert.Equal(4, product.ReviewsCount);
    }

    [Fact]
    public void ApplyReview_UpdateExistingReview_RecalculatesAverageWithoutIncrementingCount()
    {
        var product = CreateProduct();

        product.ApplyReview(5);
        product.ApplyReview(3); // sum: 8, avg: 4.00, count: 2

        // Buyer changes review rating from 3 to 5
        product.ApplyReview(newRating: 5, oldRating: 3); // sum: 8 - 3 + 5 = 10, avg: 5.00, count: 2

        Assert.Equal(5.00m, product.AverageRating);
        Assert.Equal(2, product.ReviewsCount);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(6)]
    public void ApplyReview_InvalidNewRating_ThrowsArgumentOutOfRangeException(int invalidRating)
    {
        var product = CreateProduct();

        var ex = Assert.Throws<ArgumentOutOfRangeException>(() =>
            product.ApplyReview(invalidRating));

        Assert.Equal("newRating", ex.ParamName);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void ApplyReview_InvalidOldRating_ThrowsArgumentOutOfRangeException(int invalidOldRating)
    {
        var product = CreateProduct();

        var ex = Assert.Throws<ArgumentOutOfRangeException>(() =>
            product.ApplyReview(5, invalidOldRating));

        Assert.Equal("oldRating", ex.ParamName);
    }

    [Fact]
    public void RemoveReview_DecrementsCountAndRecalculatesAverage()
    {
        var product = CreateProduct();

        product.ApplyReview(5);
        product.ApplyReview(3); // avg: 4.00, count: 2

        product.RemoveReview(3); // avg: 5.00, count: 1

        Assert.Equal(5.00m, product.AverageRating);
        Assert.Equal(1, product.ReviewsCount);

        product.RemoveReview(5); // avg: 0.00, count: 0

        Assert.Equal(0.00m, product.AverageRating);
        Assert.Equal(0, product.ReviewsCount);
    }

    [Fact]
    public void ApplyReview_UpdatesTimestamp()
    {
        var product = CreateProduct();
        var originalUpdated = product.UpdatedAt;

        product.ApplyReview(4);

        Assert.True(product.UpdatedAt >= originalUpdated);
    }
}
