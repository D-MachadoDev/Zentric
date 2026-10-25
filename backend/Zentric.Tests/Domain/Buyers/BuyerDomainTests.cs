using System;
using Xunit;
using Zentric.Domain.Buyers;
using Zentric.Domain.Buyers.ValueObjects;

namespace Zentric.Tests.Domain.Buyers
{
    public class BuyerDomainTests
    {
        private static Address CreateSampleAddress(string street = "Calle 100 # 15-20") =>
            new(street, "Bogotá", "Cundinamarca", "110111", "Colombia");

        [Fact]
        public void Create_FactoryMethod_InitializesBuyerCorrectly()
        {
            var userId = Guid.NewGuid();
            var buyer = Buyer.Create(userId, "Cra 7 # 72-01", "Bogotá", "Bogota DC", "110221", "Colombia");

            Assert.Equal(userId, buyer.UserId);
            Assert.Equal("Cra 7 # 72-01", buyer.MainAddress.Street);
            Assert.Equal("Bogotá", buyer.MainAddress.City);
            Assert.True(buyer.IsActiveForCommerce);
            Assert.Empty(buyer.AdditionalAddresses);
            Assert.True(buyer.CreatedAt <= DateTime.UtcNow);
        }

        [Fact]
        public void Constructor_EmptyUserId_ThrowsArgumentException()
        {
            var address = CreateSampleAddress();
            Assert.Throws<ArgumentException>(() => new Buyer(Guid.Empty, address));
        }

        [Fact]
        public void Constructor_NullMainAddress_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() => new Buyer(Guid.NewGuid(), null!));
        }

        [Fact]
        public void AdditionalAddress_ValidAddress_AppendsToCollection()
        {
            var buyer = new Buyer(Guid.NewGuid(), CreateSampleAddress("Calle 1"));
            var secondary = CreateSampleAddress("Carrera 2");

            buyer.AdditionalAddress(secondary);

            Assert.Single(buyer.AdditionalAddresses);
            Assert.Contains(secondary, buyer.AdditionalAddresses);
        }

        [Fact]
        public void AdditionalAddress_NullAddress_ThrowsArgumentException()
        {
            var buyer = new Buyer(Guid.NewGuid(), CreateSampleAddress());
            Assert.Throws<ArgumentException>(() => buyer.AdditionalAddress(null!));
        }

        [Fact]
        public void RemoveAdditionalAddress_ExistingAddress_RemovesSuccessfully()
        {
            var buyer = new Buyer(Guid.NewGuid(), CreateSampleAddress("Calle 1"));
            var secondary = CreateSampleAddress("Carrera 2");
            buyer.AdditionalAddress(secondary);

            buyer.RemoveAdditionalAddress(secondary);

            Assert.Empty(buyer.AdditionalAddresses);
        }

        [Fact]
        public void RemoveAdditionalAddress_NonExistentAddress_ThrowsInvalidOperationException()
        {
            var buyer = new Buyer(Guid.NewGuid(), CreateSampleAddress("Calle 1"));
            var nonExistent = CreateSampleAddress("Carrera 99");

            Assert.Throws<InvalidOperationException>(() => buyer.RemoveAdditionalAddress(nonExistent));
        }

        [Fact]
        public void UpdateMainAddress_ValidAddress_ReplacesMainAddress()
        {
            var buyer = new Buyer(Guid.NewGuid(), CreateSampleAddress("Calle 1"));
            var newMain = CreateSampleAddress("Avenida Siempre Viva 742");

            buyer.UpdateMainAddress(newMain);

            Assert.Equal(newMain, buyer.MainAddress);
        }

        [Fact]
        public void UpdateMainAddress_NullAddress_ThrowsArgumentException()
        {
            var buyer = new Buyer(Guid.NewGuid(), CreateSampleAddress());
            Assert.Throws<ArgumentException>(() => buyer.UpdateMainAddress(null!));
        }
    }
}
