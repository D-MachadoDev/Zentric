using System;
using Xunit;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Domain.Products
{
    public class MoneyAndValueObjectsTests
    {
        [Fact]
        public void MixedCurrencyException_PropertiesAndMessage_SetCorrectly()
        {
            var ex = new MixedCurrencyException("USD", "COP");

            Assert.Equal("USD", ex.Currency);
            Assert.Equal("COP", ex.Expected);
            Assert.Contains("Cannot mix currencies in the same operation: 'COP' and 'USD'.", ex.Message);
        }

        [Fact]
        public void VariantAttribute_ValidValues_NormalizedAndEquatable()
        {
            var attr1 = new VariantAttribute("  Color  ", "  Rojo  ");
            var attr2 = new VariantAttribute("color", "rojo");

            Assert.Equal("Color", attr1.Name);
            Assert.Equal("Rojo", attr1.Value);
            Assert.Equal("Color=Rojo", attr1.ToString());
            Assert.True(attr1.Equals(attr2));
            Assert.True(attr1.Equals((object)attr2));
            Assert.False(attr1.Equals(null));
            Assert.Equal(attr1.GetHashCode(), attr2.GetHashCode());
        }

        [Theory]
        [InlineData("", "Valor")]
        [InlineData("   ", "Valor")]
        [InlineData(null, "Valor")]
        [InlineData("Nombre", "")]
        [InlineData("Nombre", "   ")]
        [InlineData("Nombre", null)]
        public void VariantAttribute_InvalidEmptyValues_ThrowsArgumentException(string? name, string? val)
        {
            Assert.Throws<ArgumentException>(() => new VariantAttribute(name!, val!));
        }

        [Fact]
        public void VariantAttribute_Exceeding50Characters_ThrowsArgumentException()
        {
            var longString = new string('A', 51);
            Assert.Throws<ArgumentException>(() => new VariantAttribute(longString, "Val"));
            Assert.Throws<ArgumentException>(() => new VariantAttribute("Name", longString));
        }
    }
}
