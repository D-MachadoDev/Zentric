using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Ports;

namespace Zentric.Application.Users.Queries
{
    /// <summary>
    /// Consulta para verificar si un token de restablecimiento de contraseña
    /// existe, no ha sido utilizado y aún no ha expirado.
    /// Permite al frontend validar el enlace al abrir la página.
    /// </summary>
    public sealed record ValidateResetTokenQuery(string Token) : IRequest<Result<bool>>;

    public sealed class ValidateResetTokenQueryHandler : IRequestHandler<ValidateResetTokenQuery, Result<bool>>
    {
        private readonly IPasswordResetTokenRepository _tokenRepository;

        public ValidateResetTokenQueryHandler(IPasswordResetTokenRepository tokenRepository)
        {
            _tokenRepository = tokenRepository;
        }

        public async Task<Result<bool>> Handle(ValidateResetTokenQuery request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Token))
            {
                return Result<bool>.Failure("Token cannot be empty.");
            }

            string tokenHash = PasswordResetToken.ComputeHash(request.Token);
            var token = await _tokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken);

            if (token == null)
            {
                return Result<bool>.Failure("Invalid or expired reset token.");
            }

            if (!token.IsValid(DateTime.UtcNow))
            {
                return Result<bool>.Failure("The reset token has expired or has already been used.");
            }

            return Result<bool>.Success(true);
        }
    }
}
