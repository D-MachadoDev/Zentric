using Zentric.Domain.Products;

namespace Zentric.Tests.Products;

public sealed class ReviewTests
{
    private static readonly Guid ValidProductId = Guid.NewGuid();
    private static readonly Guid ValidUserId = Guid.NewGuid();

    [Fact]
    public void Constructor_ValidParameters_InstantiatesSuccessfully()
    {
        var comment = "Excelente producto, superó mis expectativas.";
        var review = new Review(ValidProductId, ValidUserId, 5, comment);

        Assert.NotEqual(Guid.Empty, review.Id);
        Assert.Equal(ValidProductId, review.ProductId);
        Assert.Equal(ValidUserId, review.UserId);
        Assert.Equal(5, review.Rating);
        Assert.Equal(comment, review.Comment);
        Assert.True(review.CreatedAt <= DateTime.UtcNow);
        Assert.Equal(review.CreatedAt, review.UpdatedAt);
    }

    [Fact]
    public void Constructor_WithoutComment_InstantiatesWithNullComment()
    {
        var review = new Review(ValidProductId, ValidUserId, 4);

        Assert.Equal(4, review.Rating);
        Assert.Null(review.Comment);
    }

    [Fact]
    public void Constructor_EmptyProductId_ThrowsArgumentException()
    {
        var ex = Assert.Throws<ArgumentException>(() =>
            new Review(Guid.Empty, ValidUserId, 5, "Valido"));

        Assert.Equal("productId", ex.ParamName);
    }

    [Fact]
    public void Constructor_EmptyUserId_ThrowsArgumentException()
    {
        var ex = Assert.Throws<ArgumentException>(() =>
            new Review(ValidProductId, Guid.Empty, 5, "Valido"));

        Assert.Equal("userId", ex.ParamName);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(6)]
    [InlineData(100)]
    public void Constructor_RatingOutOfRange_ThrowsArgumentOutOfRangeException(int invalidRating)
    {
        var ex = Assert.Throws<ArgumentOutOfRangeException>(() =>
            new Review(ValidProductId, ValidUserId, invalidRating, "Comentario"));

        Assert.Equal("rating", ex.ParamName);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(4)]
    [InlineData(5)]
    public void Constructor_ValidRatings1To5_Succeeds(int validRating)
    {
        var review = new Review(ValidProductId, ValidUserId, validRating);
        Assert.Equal(validRating, review.Rating);
    }

    [Fact]
    public void Constructor_CommentExceeds2000Chars_ThrowsArgumentException()
    {
        var longComment = new string('x', 2001);

        var ex = Assert.Throws<ArgumentException>(() =>
            new Review(ValidProductId, ValidUserId, 3, longComment));

        Assert.Equal("comment", ex.ParamName);
    }

    [Fact]
    public void Constructor_TrimsComment()
    {
        var review = new Review(ValidProductId, ValidUserId, 4, "   Espacios alrededor   ");
        Assert.Equal("Espacios alrededor", review.Comment);
    }

    [Fact]
    public void Update_ValidParameters_UpdatesRatingCommentAndTimestamp()
    {
        var review = new Review(ValidProductId, ValidUserId, 3, "Original");
        var originalUpdated = review.UpdatedAt;

        review.Update(5, "Actualizado y mucho mejor");

        Assert.Equal(5, review.Rating);
        Assert.Equal("Actualizado y mucho mejor", review.Comment);
        Assert.True(review.UpdatedAt >= originalUpdated);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void Update_InvalidRating_ThrowsArgumentOutOfRangeException(int invalidRating)
    {
        var review = new Review(ValidProductId, ValidUserId, 4);

        var ex = Assert.Throws<ArgumentOutOfRangeException>(() =>
            review.Update(invalidRating, "Nuevo"));

        Assert.Equal("rating", ex.ParamName);
    }

    [Fact]
    public void Update_CommentExceeds2000Chars_ThrowsArgumentException()
    {
        var review = new Review(ValidProductId, ValidUserId, 4);
        var longComment = new string('a', 2001);

        var ex = Assert.Throws<ArgumentException>(() =>
            review.Update(4, longComment));

        Assert.Equal("comment", ex.ParamName);
    }
}
