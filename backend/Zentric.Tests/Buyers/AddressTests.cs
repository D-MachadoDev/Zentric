using System;
using Xunit;
using Zentric.Domain.Buyers;
using Zentric.Domain.Buyers.ValueObjects;

namespace Zentric.Tests.Buyers
{
    /// <summary>
    /// Pruebas del Value Object Address y de su uso en Buyer.
    /// ZENTRIC.md Dominio 2 exige direccion principal obligatoria.
    /// </summary>
    public class AddressTests
    {
        private static Address Bogota() => new("Calle 100 #5-1", "Bogota", "Cundinamarca", "110111", "Colombia");

        [Fact]
        public void Create_WithAllFields_KeepsEveryValue()
        {
            var address = Bogota();

            Assert.Equal("Calle 100 #5-1", address.Street);
            Assert.Equal("Bogota", address.City);
            Assert.Equal("Cundinamarca", address.State);
            Assert.Equal("110111", address.ZipCode);
            Assert.Equal("Colombia", address.Country);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void Create_WithEmptyStreet_Throws(string? street)
        {
            Assert.Throws<ArgumentException>(() => new Address(street!, "Bogota", "Cund", "110", "CO"));
        }

        [Fact]
        public void Create_WithEmptyCity_Throws()
        {
            Assert.Throws<ArgumentException>(() => new Address("Calle 1", " ", "Cund", "110", "CO"));
        }

        [Fact]
        public void Create_TrimsSurroundingSpaces()
        {
            var address = new Address("  Calle 1  ", " Bogota ", "Cund", "110", "CO");

            Assert.Equal("Calle 1", address.Street);
            Assert.Equal("Bogota", address.City);
        }

        [Fact]
        public void Addresses_WithSameValues_AreEqual()
        {
            // El VO se compara por valor: dos direcciones identicas son la misma.
            Assert.Equal(Bogota(), Bogota());
        }

        [Fact]
        public void Addresses_WithDifferentCity_AreNotEqual()
        {
            var other = new Address("Calle 100 #5-1", "Medellin", "Antioquia", "050001", "Colombia");

            Assert.NotEqual(Bogota(), other);
        }

        [Fact]
        public void Buyer_RequiresMainAddress()
        {
            Assert.Throws<ArgumentException>(() => new Buyer(Guid.NewGuid(), null!));
        }

        [Fact]
        public void Buyer_StoresAddressAsValueObject()
        {
            var address = Bogota();

            var buyer = new Buyer(Guid.NewGuid(), address);

            Assert.Equal(address, buyer.MainAddress);
            Assert.Empty(buyer.AdditionalAddresses);
        }

        [Fact]
        public void Buyer_UpdateMainAddress_ReplacesTheInstance()
        {
            // El VO es inmutable: cambiar de casa genera otra direccion.
            var buyer = new Buyer(Guid.NewGuid(), Bogota());
            var nueva = new Address("Carrera 7 #32-16", "Bogota", "Cundinamarca", "110111", "Colombia");

            buyer.UpdateMainAddress(nueva);

            Assert.Equal(nueva, buyer.MainAddress);
        }

        [Fact]
        public void Buyer_AdditionalAddress_IsOptional()
        {
            // ZENTRIC.md Dominio 2: las direcciones adicionales NO son obligatorias.
            var buyer = new Buyer(Guid.NewGuid(), Bogota());

            Assert.Empty(buyer.AdditionalAddresses);

            buyer.AdditionalAddress(new Address("Av 9 #1-1", "Medellin", "Antioquia", "050001", "Colombia"));

            Assert.Single(buyer.AdditionalAddresses);
        }

        [Fact]
        public void Buyer_RemoveUnknownAdditionalAddress_Throws()
        {
            var buyer = new Buyer(Guid.NewGuid(), Bogota());

            Assert.Throws<InvalidOperationException>(
                () => buyer.RemoveAdditionalAddress(new Address("Otra", "Otra", "Otra", "1", "CO")));
        }
    }
}