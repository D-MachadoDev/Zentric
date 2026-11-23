using System;
using System.Linq;
using Xunit;
using Zentric.Domain.Users.Enums;
using Zentric.Infrastructure.Security;

namespace Zentric.Tests.Security
{
    /// <summary>
    /// Criterios de aceptacion de ADsobre la credencial del usuario.
    ///
    /// El coste se baja a 1000 iteraciones solo en estas pruebas: verificar
    /// PBKDF2-HMAC-SHA256 con 600 000 iteraciones cuesta cientos de
    /// milisegundos por llamada y haria la suite inutilizable. El algoritmo, el
    /// formato autocontenido y la comparacion en tiempo constante son los mismos.
    /// </summary>
    public class Pbkdf2PasswordHasherTests
    {
        private static Pbkdf2PasswordHasher FastHasher() => new(1000);

        /// <summary>
        /// 1. Estructura criptográfica autocontenida.
        /// </summary>
        [Fact(DisplayName = "1. Estructura Criptográfica: Retorna formato modular autocontenido (algoritmo$coste$salt$subkey)")]
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

        /// <summary>
        /// 2. Cero fuga de texto plano.
        /// </summary>
        [Fact(DisplayName = "2. No Reversibilidad: El hash generado jamás contiene la contraseña en texto plano")]
        public void Hash_DoesNotContainThePlaintextPassword()
        {
            Assert.DoesNotContain("SecretPassword1", FastHasher().Hash("SecretPassword1"), StringComparison.Ordinal);
        }

        /// <summary>
        /// 3. Salt aleatorio por contraseña.
        /// </summary>
        [Fact(DisplayName = "3. Salting Aleatorio Único: Mismas contraseñas producen hashes distintos por salts únicos")]
        public void Hash_UsesDifferentSaltEachTime_SoEqualPasswordsGetDifferentHashes()
        {
            var hasher = FastHasher();

            Assert.NotEqual(hasher.Hash("SecretPassword1"), hasher.Hash("SecretPassword1"));
        }

        /// <summary>
        /// 4. Verificación de credencial correcta.
        /// </summary>
        [Fact(DisplayName = "4. Verificación Exitosa: Contraseña correcta verifica satisfactoriamente contra el hash")]
        public void Verify_CorrectPassword_ReturnsTrue()
        {
            var hasher = FastHasher();
            string hash = hasher.Hash("SecretPassword1");

            Assert.True(hasher.Verify("SecretPassword1", hash));
        }

        /// <summary>
        /// 5. Contraseña incorrecta.
        /// </summary>
        [Fact(DisplayName = "5. Contraseña Incorrecta: Falla verificación retornando false sin excepciones")]
        public void Verify_WrongPassword_ReturnsFalse()
        {
            var hasher = FastHasher();
            string hash = hasher.Hash("SecretPassword1");

            Assert.False(hasher.Verify("SecretPassword2", hash));
        }

        /// <summary>
        /// 6. Contraseña vacía.
        /// </summary>
        [Fact(DisplayName = "6. Contraseña Vacía: Rechaza contraseñas en blanco retornando false")]
        public void Verify_EmptyPassword_ReturnsFalse()
        {
            var hasher = FastHasher();

            Assert.False(hasher.Verify(string.Empty, hasher.Hash("SecretPassword1")));
        }

        /// <summary>
        /// 7. Formatos de hash que el sistema debe rechazar sin lanzar excepcion.
        /// </summary>
        [Theory(DisplayName = "7. Tolerancia y Blindaje de Formato: Hashes heredados o corruptos retornan false sin romper el runtime")]
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

        /// <summary>
        /// 8. Hashes con costes previos siguen verificando.
        /// </summary>
        [Fact(DisplayName = "8. Compatibilidad de Coste Evolutivo: Hashes creados con diferentes iteraciones siguen verificando")]
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

        /// <summary>
        /// 9. Costes peligrosamente bajos deben ser rechazados en constructor.
        /// </summary>
        [Fact(DisplayName = "9. Umbral Mínimo de Seguridad: Rechaza configuraciones de coste inseguras (<1000)")]
        public void Constructor_RejectsAnUnsafeCost()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new Pbkdf2PasswordHasher(10));
        }
    }
}
