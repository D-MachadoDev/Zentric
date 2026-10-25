using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Application.Users.Commands
{
    /// <summary>
    /// Autenticacion de un usuario (ADR-0009, cierra RG-01).
    /// </summary>
    /// <param name="Email">Correo registrado. Es el identificador de acceso.</param>
    /// <param name="Password">Contrasena en claro. Viaja solo en esta peticion y nunca se persiste.</param>
    public record LoginCommand(string Email, string Password) : IRequest<Result<AuthTokenResponse>>;

    /// <summary>Credencial emitida e identidad asociada, que el cliente usa para construir su sesion.</summary>
    public sealed record AuthTokenResponse(
        string Token,
        DateTimeOffset ExpiresAt,
        Guid UserId,
        string Email,
        string FullName,
        string Role);

    public sealed class LoginCommandHandler : IRequestHandler<LoginCommand, Result<AuthTokenResponse>>
    {
        /// <summary>
        /// Unico mensaje para toda autenticacion fallida. Distinguir "el correo no
        /// existe" de "la contrasena no coincide" permitiria enumerar las cuentas
        /// registradas probando correos.
        /// </summary>
        private const string InvalidCredentials = "Invalid email or password.";

        /// <summary>
        /// Hash descartable usado para igualar el tiempo de respuesta cuando el
        /// correo no existe. Sin esto, un login fallido por correo inexistente
        /// responderia mucho mas rapido que uno por contrasena incorrecta, y esa
        /// diferencia revelaria que cuentas estan registradas.
        /// </summary>
        private const string DecoyHash =
            "pbkdf2-sha256$600000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

        private readonly IUserRepository _userRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IAuthTokenService _tokenService;

        public LoginCommandHandler(
            IUserRepository userRepository,
            IPasswordHasher passwordHasher,
            IAuthTokenService tokenService)
        {
            _userRepository = userRepository;
            _passwordHasher = passwordHasher;
            _tokenService = tokenService;
        }

        public async Task<Result<AuthTokenResponse>> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            Email email;
            try
            {
                email = new Email(request.Email);
            }
            catch (ArgumentException)
            {
                return Result<AuthTokenResponse>.Failure(InvalidCredentials);
            }

            var user = await _userRepository.GetByEmailAsync(email);

            // Se verifica siempre, exista el usuario o no, para que el tiempo de
            // respuesta no dependa de si la cuenta existe.
            bool passwordMatches = _passwordHasher.Verify(request.Password, user?.PasswordHash ?? DecoyHash);

            if (user is null || !passwordMatches)
            {
                return Result<AuthTokenResponse>.Failure(InvalidCredentials);
            }

            // CanAuthenticate cubre tanto el usuario bloqueado como el eliminado
            // (ZENTRIC.md Dominio 1: el estado es Activo o Bloqueado).
            if (!user.CanAuthenticate)
            {
                return Result<AuthTokenResponse>.Failure(InvalidCredentials);
            }

            var token = _tokenService.Issue(user.Id, user.Email.Value, user.FullName.Value, user.Role);

            return Result<AuthTokenResponse>.Success(new AuthTokenResponse(
                token.Value,
                token.ExpiresAt,
                user.Id,
                user.Email.Value,
                user.FullName.Value,
                user.Role.ToString()));
        }
    }
}
