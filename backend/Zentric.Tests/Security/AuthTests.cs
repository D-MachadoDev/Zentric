using System;
using System.Linq;
using Xunit;
using Zentric.Domain.Users.Enums;
using Zentric.Infrastructure.Security;

namespace Zentric.Tests.Security
{
    /// <summary>
    /// Criterios de aceptacion de ADR-0009 sobre la credencial del usuario.
    ///
    /// El coste se baja a 1000 iteraciones solo en estas pruebas: verificar
    /// PBKDF2-HMAC-SHA256 con 600 000 iteraciones cuesta cientos de
    /// milisegundos por llamada y haria la suite inutilizable. El algoritmo, el
    /// formato autocontenido y la comparacion en tiempo constante son los mismos.
    /// </summary>
    public class Pbkdf2PasswordHasherTests
    {
        private static Pbkdf2PasswordHasher FastHasher() => new(1000);

        [Fact]
        public void Hash_ReturnsSelfDescribingFormatWithAlgorithmCostSaltAndSubkey()
        {
            string hash = FastHasher().Hash("SecretPassword1");

            string[] parts = hash.Split('$');
            Assert.Equal(4, parts.Length);
            Assert.Equal("pbkdf2-sha256", parts[0]);
            Assert.Equal("1000", parts[1]);
            Assert.False(string.IsNullOrWhiteSpace(parts[2]));
            Assert.False(string.IsNullOrWhiteSpace(parts[3]));
        }

        [Fact]
        public void Hash_DoesNotContainThePlaintextPassword()
        {
            Assert.DoesNotContain("SecretPassword1", FastHasher().Hash("SecretPassword1"), StringComparison.Ordinal);
        }

        [Fact]
        public void Hash_UsesDifferentSaltEachTime_SoEqualPasswordsGetDifferentHashes()
        {
            var hasher = FastHasher();

            Assert.NotEqual(hasher.Hash("SecretPassword1"), hasher.Hash("SecretPassword1"));
        }

        [Fact]
        public void Verify_CorrectPassword_ReturnsTrue()
        {
            var hasher = FastHasher();
            string hash = hasher.Hash("SecretPassword1");

            Assert.True(hasher.Verify("SecretPassword1", hash));
        }

        [Fact]
        public void Verify_WrongPassword_ReturnsFalse()
        {
            var hasher = FastHasher();
            string hash = hasher.Hash("SecretPassword1");

            Assert.False(hasher.Verify("SecretPassword2", hash));
        }

        [Fact]
        public void Verify_EmptyPassword_ReturnsFalse()
        {
            var hasher = FastHasher();

            Assert.False(hasher.Verify(string.Empty, hasher.Hash("SecretPassword1")));
        }

        /// <summary>
        /// Formatos de hash que el sistema debe rechazar sin lanzar excepcion.
        /// Antes de ADR-0009 el cliente escribia el hash, asi que pueden existir
        /// valores con otra forma: es un fallo de credencial, no un fallo tecnico.
        /// </summary>
        [Theory]
        [InlineData("")]
        [InlineData("legacy-hash-written-by-the-client")]
        [InlineData("pbkdf2-sha256$1000$not-base64!$also-not")]
        [InlineData("bcrypt$12$abc$def")]
        [InlineData("pbkdf2-sha256$0$AAAA$AAAA")]
        [InlineData("pbkdf2-sha256")]
        public void Verify_StoredHashWithUnknownFormat_ReturnsFalseInsteadOfThrowing(string storedHash)
        {
            Assert.False(FastHasher().Verify("SecretPassword1", storedHash));
        }

        [Fact]
        public void Verify_HashCreatedWithADifferentCost_StillVerifies()
        {
            // El formato recuerda con que coste se creo, de modo que subir el
            // coste en el futuro no invalida los hashes ya almacenados.
            string cheap = new Pbkdf2PasswordHasher(1000).Hash("SecretPassword1");
            string expensive = new Pbkdf2PasswordHasher(2000).Hash("SecretPassword1");
            var verifier = new Pbkdf2PasswordHasher(4000);

            Assert.True(verifier.Verify("SecretPassword1", cheap));
            Assert.True(verifier.Verify("SecretPassword1", expensive));
        }

        [Fact]
        public void Constructor_RejectsAnUnsafeCost()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new Pbkdf2PasswordHasher(10));
        }
    }
}
