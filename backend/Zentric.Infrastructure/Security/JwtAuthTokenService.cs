using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;

namespace Zentric.Infrastructure.Security
{
    /// <summary>
    /// Adaptador de <see cref="IAuthTokenService"/> que emite JWT con HS256.
    ///
    /// Claims emitidos (ADR-0009): <c>sub</c> con el identificador del usuario,
    /// <c>email</c>, <c>name</c> y <c>role</c>. <c>sub</c> es tambien la
    /// identidad de comprador, porque <c>Buyer.UserId</c> es 1:1 con
    /// <c>User.Id</c>.
    ///
    /// El nombre se emite como <c>name</c> y no como <c>unique_name</c>: el
    /// validador de .NET 10 (JsonWebTokenHandler) no aplica el mapeo de claims
    /// de entrada, asi que el controlador tiene que encontrar la claim con el
    /// nombre literal que aqui se escribe. Fue un defecto real: con
    /// <c>unique_name</c> la API autenticaba bien pero GET /auth/me devolvia el
    /// nombre vacio.
    ///
    /// El reloj se recibe por constructor en vez de leerse de
    /// <see cref="DateTimeOffset.UtcNow"/> para que la caducidad sea comprobable
    /// en pruebas sin esperar una hora.
    /// </summary>
    public sealed class JwtAuthTokenService : IAuthTokenService
    {
        private readonly JwtOptions _options;
        private readonly Func<DateTimeOffset> _clock;

        public JwtAuthTokenService(IOptions<JwtOptions> options, Func<DateTimeOffset> clock)
        {
            _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
            _options.Validate();
            _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        }

        public AuthToken Issue(Guid userId, string email, string fullName, UserRole role)
        {
            DateTimeOffset issuedAt = _clock();
            DateTimeOffset expiresAt = issuedAt.AddMinutes(_options.ExpirationMinutes);

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new(JwtRegisteredClaimNames.Email, email),
                new(JwtRegisteredClaimNames.Name, fullName),
                new(ClaimTypes.Role, role.ToString()),
                new(ClaimTypes.NameIdentifier, userId.ToString()),
            };

            var key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(_options.SigningKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _options.Issuer,
                audience: _options.Audience,
                claims: claims,
                notBefore: issuedAt.UtcDateTime,
                expires: expiresAt.UtcDateTime,
                signingCredentials: credentials);

            return new AuthToken(new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
        }
    }
}
