using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Products;

/// <summary>
/// Ramas de Money sin cubrir: lista blanca de divisas, resta bajo
/// cero, cantidad negativa y la igualdad.
/// </summary>
public sealed class MoneyGuardsTests
{
    [Fact]
    public void Constructor_MontoNegativo_Lanza()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new Money(-1m, "COP"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Normalize_Vacia_Lanza(string currency)
    {
        Assert.Throws<ArgumentException>(() => SupportedCurrencies.Normalize(currency));
    }

    [Theory]
    [InlineData("CO")]
    [InlineData("COPP")]
    public void Normalize_LongitudDistintaDeTres_Lanza(string currency)
    {
        Assert.Throws<ArgumentException>(() => SupportedCurrencies.Normalize(currency));
    }

    [Fact]
    public void Normalize_NoSoportada_Lanza()
    {
        // Solo las divisas de la lista blanca; "USD" no esta habilitada.
        Assert.Throws<ArgumentException>(() => SupportedCurrencies.Normalize("USD"));
        Assert.Throws<ArgumentException>(() => new Money(10m, "USD"));
    }

    [Theory]
    [InlineData("cop")]
    [InlineData(" Cop ")]
    public void Normalize_MinusculasYEspacios_RetornaCOP(string currency)
    {
        Assert.Equal("COP", SupportedCurrencies.Normalize(currency));
        Assert.True(SupportedCurrencies.IsSupported(currency));
        Assert.Contains("COP", SupportedCurrencies.Codes);
    }

    [Fact]
    public void IsSupported_Vacia_RetornaFalse()
    {
        Assert.False(SupportedCurrencies.IsSupported("  "));
    }

    [Fact]
    public void Subtract_MayorQueSaldo_Lanza()
    {
        var balance = new Money(5m, "COP");

        Assert.Throws<ArgumentOutOfRangeException>(() => balance.Subtract(new Money(10m, "COP")));
    }

    [Fact]
    public void Subtract_Igual_LlegaACero()
    {
        Assert.Equal(new Money(0m, "COP"), new Money(5m, "COP").Subtract(new Money(5m, "COP")));
    }

    [Fact]
    public void Multiply_Negativo_Lanza()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new Money(5m, "COP").Multiply(-1));
    }

    [Fact]
    public void Equals_Null_RetornaFalse()
    {
        var money = new Money(5m, "COP");

        Assert.False(money.Equals(null));
        Assert.False(money.Equals((object?)null));
        Assert.False(money.Equals("5 COP"));
    }

    [Fact]
    public void Equals_MismoValor_RetornaTrue()
    {
        var left = new Money(5m, "COP");

        Assert.True(left.Equals(new Money(5m, "COP")));
        Assert.True(left.Equals((object)new Money(5m, "COP")));
        Assert.Equal(left.GetHashCode(), new Money(5m, "COP").GetHashCode());
    }

    [Fact]
    public void ToString_FormateaConDosDecimales()
    {
        Assert.Equal("10.50 COP", new Money(10.5m, "COP").ToString());
    }
}
