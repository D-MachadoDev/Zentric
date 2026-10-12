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
        var money = new Money(10.005m, "COP");

        Assert.Equal(10.01m, money.Amount);
    }

    [Fact]
    public void Constructor_LowerCaseCurrency_NormalizesToUpperCase()
    {
        var money = new Money(1m, " cop ");

        Assert.Equal("COP", money.Currency);
    }

    [Fact]
    public void Constructor_NegativeAmount_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new Money(-0.01m, "COP"));
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
    [InlineData("COPX")]
    [InlineData("ABCD")]
    public void Constructor_UnsupportedCurrency_ThrowsArgumentException(string currency)
    {
        // Lista blanca (Q-16): longitud valida no significa divisa soportada.
        Assert.Throws<ArgumentException>(() => new Money(1m, currency));
    }

    [Fact]
    public void Constructor_UnsupportedButWellFormedCurrency_Throws()
    {
        // "USD" tiene 3 letras pero no esta en la lista blanca.
        Assert.Throws<ArgumentException>(() => new Money(1m, "USD"));
    }

    [Fact]
    public void Add_SameCurrency_ReturnsSum()
    {
        var result = new Money(10m, "COP").Add(new Money(2.50m, "COP"));

        Assert.Equal(new Money(12.50m, "COP"), result);
    }

    [Fact]
    public void Add_DifferentCurrency_ThrowsMixedCurrencyException()
    {
        // Q-16: al mezclar divisas se lanza una excepcion de negocio (400),
        // no una excepcion tecnica (500).
        Assert.Throws<ArgumentException>(() => new Money(10m, "COP").Add(new Money(1m, "EUR")));
    }

    [Fact]
    public void Add_UnsupportedCurrency_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new Money(10m, "COP").Add(new Money(1m, "USD")));
    }

    [Fact]
    public void Subtract_SameCurrency_ReturnsDifference()
    {
        var result = new Money(10m, "COP").Subtract(new Money(4m, "COP"));

        Assert.Equal(new Money(6m, "COP"), result);
    }

    [Fact]
    public void Subtract_ResultWouldBeNegative_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new Money(10m, "COP").Subtract(new Money(11m, "COP")));
    }

    [Fact]
    public void Multiply_ValidQuantity_ReturnsScaledAmount()
    {
        var result = new Money(2.50m, "COP").Multiply(4);

        Assert.Equal(new Money(10m, "COP"), result);
    }

    [Fact]
    public void Multiply_ZeroQuantity_ReturnsZeroAmount()
    {
        var result = new Money(2.50m, "COP").Multiply(0);

        Assert.Equal(new Money(0m, "COP"), result);
    }

    [Fact]
    public void Multiply_NegativeQuantity_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new Money(2.50m, "COP").Multiply(-1));
    }

    [Fact]
    public void Equals_SameAmountAndCurrency_ReturnsTrue()
    {
        Assert.True(new Money(5m, "cop").Equals(new Money(5m, "COP")));
    }

    [Fact]
    public void Equals_DifferentAmount_ReturnsFalse()
    {
        Assert.False(new Money(5m, "COP").Equals(new Money(5.01m, "COP")));
    }

    [Fact]
    public void ToString_ValidMoney_ReturnsAmountAndCurrency()
    {
        Assert.Equal("10.00 COP", new Money(10m, "COP").ToString());
    }
}