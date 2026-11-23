using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Application.Users.Commands
{
    /// <summary>
    /// Comando para solicitar el restablecimiento de contraseña.
    /// Invariante de seguridad: Nunca revela si el correo electrónico está registrado
    /// o no en la plataforma para evitar ataques de enumeración de cuentas.
    /// </summary>
    public sealed record ForgotPasswordCommand(string Email) : IRequest<Result<bool>>;

    public sealed class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, Result<bool>>
    {
        private readonly IUserRepository _userRepository;
        private readonly IPasswordResetTokenRepository _tokenRepository;
        private readonly IEmailSender _emailSender;
        private readonly IUnitOfWork _unitOfWork;
        private readonly string _frontendBaseUrl;

        public ForgotPasswordCommandHandler(
            IUserRepository userRepository,
            IPasswordResetTokenRepository tokenRepository,
            IEmailSender emailSender,
            IUnitOfWork unitOfWork,
            IConfiguration configuration)
        {
            _userRepository = userRepository;
            _tokenRepository = tokenRepository;
            _emailSender = emailSender;
            _unitOfWork = unitOfWork;
            _frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:15434";
        }

        public async Task<Result<bool>> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                // Devolvemos éxito aparente o validación básica para anti-enumeración
                return Result<bool>.Success(true);
            }

            Email emailVo;
            try
            {
                emailVo = new Email(request.Email.Trim());
            }
            catch
            {
                // Formato sintácticamente inválido: respuesta uniforme sin revelar cuentas
                return Result<bool>.Success(true);
            }

            var user = await _userRepository.GetByEmailAsync(emailVo);

            // Si el usuario no existe o está bloqueado/eliminado, completamos silenciosamente
            if (user == null || !user.CanAuthenticate)
            {
                return Result<bool>.Success(true);
            }

            // Invalidar tokens previos del usuario para que solo el más reciente sea utilizable
            await _tokenRepository.InvalidateActiveTokensForUserAsync(user.Id, cancellationToken);

            // Generar token criptográfico efímero de 32 bytes (64 hex chars)
            var (rawToken, tokenEntity) = PasswordResetToken.Create(user.Id, TimeSpan.FromMinutes(15));

            await _tokenRepository.AddAsync(tokenEntity, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            string resetLink = $"{_frontendBaseUrl.TrimEnd('/')}/restablecer-contrasena?token={rawToken}&email={Uri.EscapeDataString(user.Email.Value)}";

            await _emailSender.SendPasswordResetEmailAsync(user.Email.Value, resetLink, cancellationToken);

            return Result<bool>.Success(true);
        }
    }
}
