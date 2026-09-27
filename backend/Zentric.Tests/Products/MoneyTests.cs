using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Products;

/// <summary>
/// Pruebas de caracterización del Value Object Money.
/// Referencias: backendSDD/Domain/02-value-objects.md, sección 1 (inmutable, no negativo,
/// solo se opera con la misma moneda).
/// </summary>
public sealed class MoneyTests
{
    [Fact]
    public void Constructor_ValidData_RoundsToTwoDecimalsAwayFromZero()
    {
        var money = new Money(10.005m, "USD");

        Assert.Equal(10.01m, money.Amount);
    }

    [Fact]
    public void Constructor_LowerCaseCurrency_NormalizesToUpperCase()
    {
        var money = new Money(1m, " usd ");

        Assert.Equal("USD", money.Currency);
    }

    [Fact]
    public void Constructor_NegativeAmount_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new Money(-0.01m, "USD"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    public void Constructor_EmptyCurrency_ThrowsArgumentException(string currency)
    {
        Assert.Throws<ArgumentException>(() => new Money(1m, currency));
    }

    [Theory]
    [InlineData("US")]
    [InlineData("USDX")]
    public void Constructor_CurrencyWithInvalidIsoLength_ThrowsArgumentException(string currency)
    {
        Assert.Throws<ArgumentException>(() => new Money(1m, currency));
    }

    [Fact]
    public void Add_SameCurrency_ReturnsSum()
    {
        var result = new Money(10m, "USD").Add(new Money(2.50m, "USD"));

        Assert.Equal(new Money(12.50m, "USD"), result);
    }

    [Fact]
    public void Add_DifferentCurrency_ThrowsInvalidOperationException()
    {
        Assert.Throws<InvalidOperationException>(() => new Money(10m, "USD").Add(new Money(1m, "EUR")));
    }

    [Fact]
    public void Subtract_SameCurrency_ReturnsDifference()
    {
        var result = new Money(10m, "USD").Subtract(new Money(4m, "USD"));

        Assert.Equal(new Money(6m, "USD"), result);
    }

    [Fact]
    public void Subtract_ResultWouldBeNegative_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new Money(10m, "USD").Subtract(new Money(11m, "USD")));
    }

    [Fact]
    public void Multiply_ValidQuantity_ReturnsScaledAmount()
    {
        var result = new Money(2.50m, "USD").Multiply(4);

        Assert.Equal(new Money(10m, "USD"), result);
    }

    [Fact]
    public void Multiply_ZeroQuantity_ReturnsZeroAmount()
    {
        var result = new Money(2.50m, "USD").Multiply(0);

        Assert.Equal(new Money(0m, "USD"), result);
    }

    [Fact]
    public void Multiply_NegativeQuantity_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new Money(2.50m, "USD").Multiply(-1));
    }

    [Fact]
    public void Equals_SameAmountAndCurrency_ReturnsTrue()
    {
        Assert.True(new Money(5m, "usd").Equals(new Money(5m, "USD")));
    }

    [Fact]
    public void Equals_DifferentAmount_ReturnsFalse()
    {
        Assert.False(new Money(5m, "USD").Equals(new Money(5.01m, "USD")));
    }

    [Fact]
    public void ToString_ValidMoney_ReturnsAmountAndCurrency()
    {
        Assert.Equal("10.00 USD", new Money(10m, "USD").ToString());
    }
}