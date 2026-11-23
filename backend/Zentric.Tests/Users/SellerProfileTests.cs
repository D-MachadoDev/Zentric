using Zentric.Domain.Users;

namespace Zentric.Tests.Users;

public sealed class SellerProfileTests
{
    private static readonly Guid ValidUserId = Guid.NewGuid();

    [Fact]
    public void Constructor_ValidParameters_InstantiatesSuccessfully()
    {
        var storeName = "Tech Store Official";
        var logoUrl = "https://r2.zentric.com/logos/tech-store.png";

        var profile = new SellerProfile(ValidUserId, storeName, logoUrl, isVerified: true);

        Assert.NotEqual(Guid.Empty, profile.Id);
        Assert.Equal(ValidUserId, profile.UserId);
        Assert.Equal("Tech Store Official", profile.StoreName);
        Assert.Equal(logoUrl, profile.LogoUrl);
        Assert.True(profile.IsVerified);
        Assert.True(profile.CreatedAt <= DateTime.UtcNow);
        Assert.Equal(profile.CreatedAt, profile.UpdatedAt);
    }

    [Fact]
    public void Constructor_DefaultIsVerified_IsFalse()
    {
        var profile = new SellerProfile(ValidUserId, "Fashion Store");

        Assert.False(profile.IsVerified);
        Assert.Null(profile.LogoUrl);
    }

    [Fact]
    public void Constructor_EmptyUserId_ThrowsArgumentException()
    {
        var ex = Assert.Throws<ArgumentException>(() =>
            new SellerProfile(Guid.Empty, "My Store"));

        Assert.Equal("userId", ex.ParamName);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_InvalidStoreName_ThrowsArgumentException(string? invalidName)
    {
        var ex = Assert.Throws<ArgumentException>(() =>
            new SellerProfile(ValidUserId, invalidName!));

        Assert.Equal("storeName", ex.ParamName);
    }

    [Fact]
    public void Constructor_StoreNameExceeds150Chars_ThrowsArgumentException()
    {
        var longName = new string('A', 151);

        var ex = Assert.Throws<ArgumentException>(() =>
            new SellerProfile(ValidUserId, longName));

        Assert.Equal("storeName", ex.ParamName);
    }

    [Fact]
    public void Verify_SetsIsVerifiedTrueAndUpdatesTimestamp()
    {
        var profile = new SellerProfile(ValidUserId, "Store");
        var originalUpdated = profile.UpdatedAt;

        profile.Verify();

        Assert.True(profile.IsVerified);
        Assert.True(profile.UpdatedAt >= originalUpdated);
    }

    [Fact]
    public void Unverify_SetsIsVerifiedFalseAndUpdatesTimestamp()
    {
        var profile = new SellerProfile(ValidUserId, "Store", isVerified: true);
        var originalUpdated = profile.UpdatedAt;

        profile.Unverify();

        Assert.False(profile.IsVerified);
        Assert.True(profile.UpdatedAt >= originalUpdated);
    }

    [Fact]
    public void UpdateProfile_ValidParameters_UpdatesFieldsAndTimestamp()
    {
        var profile = new SellerProfile(ValidUserId, "Old Name", "https://old.url");
        var originalUpdated = profile.UpdatedAt;

        profile.UpdateProfile("New Shiny Name", "https://r2.zentric.com/new.png");

        Assert.Equal("New Shiny Name", profile.StoreName);
        Assert.Equal("https://r2.zentric.com/new.png", profile.LogoUrl);
        Assert.True(profile.UpdatedAt >= originalUpdated);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void UpdateProfile_InvalidStoreName_ThrowsArgumentException(string? invalidName)
    {
        var profile = new SellerProfile(ValidUserId, "Valid Name");

        var ex = Assert.Throws<ArgumentException>(() =>
            profile.UpdateProfile(invalidName!, "https://valid.url"));

        Assert.Equal("storeName", ex.ParamName);
    }
}
