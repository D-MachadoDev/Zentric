using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using Xunit;
using Zentric.Domain.Users.Enums;
using Zentric.Infrastructure.Security;

namespace Zentric.Tests.Security
{
    /// <summary>
    /// Emision del token (ADR-0009). El reloj se inyecta, de modo que la
    /// caducidad se comprueba sin esperar una hora.
    /// </summary>
    public class JwtAuthTokenServiceTests
    {
        private static JwtOptions ValidOptions() => new()
        {
            Issuer = "zentric-api",
            Audience = "zentric-client",
            SigningKey = "zentric-test-signing-key-with-more-than-32-bytes",
            ExpirationMinutes = 60,
        };

        private static JwtAuthTokenService Service(JwtOptions options, DateTimeOffset now)
        {
            return new JwtAuthTokenService(
                Microsoft.Extensions.Options.Options.Create(options),
                () => now);
        }

        [Fact]
        public void Issue_ReturnsATokenThatCarriesTheIdentityClaims()
        {
            var userId = Guid.NewGuid();
            var now = new DateTimeOffset(2026, 9, 28, 10, 0, 0, TimeSpan.Zero);

            var token = Service(ValidOptions(), now)
                .Issue(userId, "juan@example.com", "Juan Perez", UserRole.Buyer);

            var parsed = new JwtSecurityTokenHandler().ReadJwtToken(token.Value);

            Assert.Equal(userId.ToString(), parsed.Claims.First(c => c.Type == "sub").Value);
            Assert.Equal("juan@example.com", parsed.Claims.First(c => c.Type == "email").Value);
            Assert.Equal(
                "Buyer",
                parsed.Claims.First(c => c.Type.EndsWith("role", StringComparison.OrdinalIgnoreCase)).Value);
            Assert.Equal("zentric-api", parsed.Issuer);
            Assert.Equal("zentric-client", parsed.Audiences.Single());
        }

        [Fact]
        public void Issue_ExpiresExactlyAtTheConfiguredMinutes()
        {
            var now = new DateTimeOffset(2026, 9, 28, 10, 0, 0, TimeSpan.Zero);

            var token = Service(ValidOptions(), now)
                .Issue(Guid.NewGuid(), "juan@example.com", "Juan Perez", UserRole.Buyer);

            Assert.Equal(now.AddMinutes(60), token.ExpiresAt);
        }

        [Fact]
        public void Constructor_RejectsAMissingSigningKey()
        {
            JwtOptions options = ValidOptions();
            options.SigningKey = string.Empty;

            // Preferimos que la API no arranque a que firme con un secreto conocido.
            var error = Assert.Throws<InvalidOperationException>(
                () => Service(options, DateTimeOffset.UtcNow));

            Assert.Contains("SigningKey", error.Message, StringComparison.Ordinal);
        }

        [Fact]
        public void Constructor_RejectsASigningKeyShorterThan32Bytes()
        {
            JwtOptions options = ValidOptions();
            options.SigningKey = "corto";

            Assert.Throws<InvalidOperationException>(() => Service(options, DateTimeOffset.UtcNow));
        }
    }
}
