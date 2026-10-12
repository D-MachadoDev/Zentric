using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Products;

/// <summary>
/// Pruebas de caracterización del Value Object VariantAttribute.
/// Referencia: backendSDD/Domain/02-aggregates-and-entities.md, sección 2 (la variante maneja
/// combinaciones tipo Talla/Color) y ADR-0002.
/// </summary>
public sealed class VariantAttributeTests
{
    [Fact]
    public void Constructor_ValidData_TrimsNameAndValue()
    {
        var attribute = new VariantAttribute("  Talla  ", "  M  ");

        Assert.Equal("Talla", attribute.Name);
        Assert.Equal("M", attribute.Value);
    }

    [Theory]
    [InlineData("", "M")]
    [InlineData("   ", "M")]
    public void Constructor_EmptyName_ThrowsArgumentException(string name, string value)
    {
        var exception = Assert.Throws<ArgumentException>(() => new VariantAttribute(name, value));

        Assert.Equal("name", exception.ParamName);
    }

    [Theory]
    [InlineData("Talla", "")]
    [InlineData("Talla", "   ")]
    public void Constructor_EmptyValue_ThrowsArgumentException(string name, string value)
    {
        var exception = Assert.Throws<ArgumentException>(() => new VariantAttribute(name, value));

        Assert.Equal("value", exception.ParamName);
    }

    [Fact]
    public void Constructor_NameTooLong_ThrowsArgumentException()
    {
        var exception = Assert.Throws<ArgumentException>(() => new VariantAttribute(new string('a', 51), "M"));

        Assert.Equal("name", exception.ParamName);
    }

    [Fact]
    public void Equals_SameNameAndValueIgnoringCase_ReturnsTrue()
    {
        Assert.True(new VariantAttribute("Talla", "M").Equals(new VariantAttribute("talla", "m")));
    }

    [Fact]
    public void Equals_DifferentValue_ReturnsFalse()
    {
        Assert.False(new VariantAttribute("Talla", "M").Equals(new VariantAttribute("Talla", "L")));
    }

    [Fact]
    public void GetHashCode_SameNameAndValueIgnoringCase_ReturnsSameHash()
    {
        Assert.Equal(
            new VariantAttribute("Talla", "M").GetHashCode(),
            new VariantAttribute("talla", "m").GetHashCode());
    }

    [Fact]
    public void ToString_ValidAttribute_ReturnsNameValuePair()
    {
        Assert.Equal("Talla=M", new VariantAttribute("Talla", "M").ToString());
    }
}