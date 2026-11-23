using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Ports;

namespace Zentric.Application.Users.Commands
{
    /// <summary>
    /// Comando para restablecer la contraseña de un usuario consumiendo un token válido.
    /// Invariante de seguridad: El token se quema (se marca con UsedAt) inmediatamente
    /// tras la actualización para impedir ataques de repetición.
    /// </summary>
    public sealed record ResetPasswordCommand(string Token, string NewPassword) : IRequest<Result<bool>>;

    public sealed class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, Result<bool>>
    {
        private readonly IPasswordResetTokenRepository _tokenRepository;
        private readonly IUserRepository _userRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IUnitOfWork _unitOfWork;

        public ResetPasswordCommandHandler(
            IPasswordResetTokenRepository tokenRepository,
            IUserRepository userRepository,
            IPasswordHasher passwordHasher,
            IUnitOfWork unitOfWork)
        {
            _tokenRepository = tokenRepository;
            _userRepository = userRepository;
            _passwordHasher = passwordHasher;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<bool>> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Token))
            {
                return Result<bool>.Failure("Token cannot be empty.");
            }

            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            {
                return Result<bool>.Failure("Password must be at least 6 characters long.");
            }

            string tokenHash = PasswordResetToken.ComputeHash(request.Token);
            var token = await _tokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken);

            DateTime now = DateTime.UtcNow;

            if (token == null)
            {
                return Result<bool>.Failure("Invalid or expired reset token.");
            }

            if (!token.IsValid(now))
            {
                return Result<bool>.Failure("The reset token has expired or has already been used.");
            }

            var user = await _userRepository.GetByIdAsync(token.UserId);
            if (user == null || !user.CanAuthenticate)
            {
                return Result<bool>.Failure("User account is not active or cannot be updated.");
            }

            string newHash = _passwordHasher.Hash(request.NewPassword);
            user.UpdatePasswordHash(newHash);
            token.Use(now);

            await _userRepository.UpdateAsync(user);
            await _tokenRepository.UpdateAsync(token, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<bool>.Success(true);
        }
    }
}
