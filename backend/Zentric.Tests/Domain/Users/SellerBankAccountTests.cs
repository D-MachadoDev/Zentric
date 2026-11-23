using System;
using Xunit;
using Zentric.Domain.Users;

namespace Zentric.Tests.Domain.Users
{
    public class SellerBankAccountTests
    {
        /// <summary>
        /// Objetivo: Validar que SellerBankAccount se inicialice con datos válidos y asigne valores correctamente.
        /// </summary>
        [Fact(DisplayName = "1. Creación exitosa de SellerBankAccount con datos bancarios válidos")]
        public void Create_ValidParameters_InitializesCorrectly()
        {
            var sellerId = Guid.NewGuid();
            var account = new SellerBankAccount(
                sellerId,
                "Bancolombia",
                "Ahorros",
                "123-456789-01",
                "Valeria Mendoza",
                "CC 1020304050");

            Assert.NotEqual(Guid.Empty, account.Id);
            Assert.Equal(sellerId, account.SellerId);
            Assert.Equal("Bancolombia", account.BankName);
            Assert.Equal("Ahorros", account.AccountType);
            Assert.Equal("123-456789-01", account.AccountNumber);
            Assert.Equal("Valeria Mendoza", account.AccountHolderName);
            Assert.Equal("CC 1020304050", account.DocumentNumber);
            Assert.True(account.CreatedAt <= DateTime.UtcNow);
        }

        /// <summary>
        /// Objetivo: Validar que SellerBankAccount rechace parámetros vacíos o nulos con ArgumentException.
        /// </summary>
        [Theory(DisplayName = "2. Constructor de SellerBankAccount rechaza campos obligatorios vacíos")]
        [InlineData("", "Ahorros", "123", "Valeria", "1020")]
        [InlineData("Bancolombia", "", "123", "Valeria", "1020")]
        [InlineData("Bancolombia", "Ahorros", "", "Valeria", "1020")]
        [InlineData("Bancolombia", "Ahorros", "123", "", "1020")]
        [InlineData("Bancolombia", "Ahorros", "123", "Valeria", "")]
        public void Create_InvalidFields_ThrowsArgumentException(
            string bank, string type, string number, string holder, string doc)
        {
            var sellerId = Guid.NewGuid();
            Assert.Throws<ArgumentException>(() =>
                new SellerBankAccount(sellerId, bank, type, number, holder, doc));
        }

        /// <summary>
        /// Objetivo: Validar que el método Update modifique los datos bancarios y actualice la fecha de modificación.
        /// </summary>
        [Fact(DisplayName = "3. Actualización de SellerBankAccount refleja nuevos datos")]
        public void Update_ValidData_UpdatesPropertiesAndTimestamp()
        {
            var sellerId = Guid.NewGuid();
            var account = new SellerBankAccount(
                sellerId,
                "Bancolombia",
                "Ahorros",
                "123",
                "Valeria",
                "1020");

            account.Update("Davivienda", "Corriente", "987", "Valeria M.", "1020-A");

            Assert.Equal("Davivienda", account.BankName);
            Assert.Equal("Corriente", account.AccountType);
            Assert.Equal("987", account.AccountNumber);
            Assert.Equal("Valeria M.", account.AccountHolderName);
            Assert.Equal("1020-A", account.DocumentNumber);
            Assert.True(account.UpdatedAt >= account.CreatedAt);
        }
    }
}
