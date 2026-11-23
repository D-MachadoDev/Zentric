using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Application.Users.Commands;
using Zentric.Application.Users.Queries;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Tests.Users
{
    public class PasswordResetTests
    {
        private readonly Mock<IUserRepository> _userRepositoryMock = new();
        private readonly Mock<IPasswordResetTokenRepository> _tokenRepositoryMock = new();
        private readonly Mock<IEmailSender> _emailSenderMock = new();
        private readonly Mock<IPasswordHasher> _passwordHasherMock = new();
        private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
        private readonly IConfiguration _configuration;

        public PasswordResetTests()
        {
            var configData = new Dictionary<string, string?>
            {
                { "Frontend:BaseUrl", "http://localhost:15434" }
            };
            _configuration = new ConfigurationBuilder().AddInMemoryCollection(configData).Build();
        }

        private static User CreateTestUser(string emailStr = "test@zentric.local", UserStatus status = UserStatus.Active)
        {
            var user = new User(
                "ID-999888",
                new FullName("Carlos", "Gómez"),
                new Email(emailStr),
                "existing_hash_123",
                UserRole.Buyer
            );

            if (status == UserStatus.Blocked)
            {
                user.Block();
            }

            return user;
        }

        /// <summary>
        /// 1. Generación de Token de Recuperación.
        /// Verifica que el token raw sea un string aleatorio seguro de 64 caracteres hex y su hash SHA-256 no reversible.
        /// </summary>
        [Fact(DisplayName = "1. Generación de Token: Crea token criptográfico aleatorio de 64 caracteres y hash SHA-256 no reversible")]
        public void PasswordResetToken_Create_ShouldGenerateSecureRandomTokenAndSha256Hash()
        {
            var userId = Guid.NewGuid();

            var (rawToken, tokenEntity) = PasswordResetToken.Create(userId, TimeSpan.FromMinutes(15));

            Assert.False(string.IsNullOrWhiteSpace(rawToken));
            Assert.Equal(64, rawToken.Length); // 32 bytes en hex = 64 caracteres
            Assert.Equal(userId, tokenEntity.UserId);
            Assert.NotEqual(rawToken, tokenEntity.TokenHash);
            Assert.Equal(PasswordResetToken.ComputeHash(rawToken), tokenEntity.TokenHash);
            Assert.False(tokenEntity.IsUsed);
            Assert.True(tokenEntity.IsValid(DateTime.UtcNow));
        }

        /// <summary>
        /// 2. Consumo de Token (Burn / Single-Use).
        /// Verifica que una vez usado, el token quede marcado como IsUsed e impida reutilizaciones subsiguientes.
        /// </summary>
        [Fact(DisplayName = "2. Consumo de Token (Burn): Quema el token en primer uso e impide estrictamente un segundo uso consecutivo")]
        public void PasswordResetToken_Use_ShouldMarkAsUsedAndPreventSubsequentUse()
        {
            var userId = Guid.NewGuid();
            var (_, tokenEntity) = PasswordResetToken.Create(userId, TimeSpan.FromMinutes(15));

            DateTime now = DateTime.UtcNow;
            tokenEntity.Use(now);

            Assert.True(tokenEntity.IsUsed);
            Assert.Equal(now, tokenEntity.UsedAt);
            Assert.False(tokenEntity.IsValid(now));

            // Segundo uso consecutivo debe arrojar InvalidOperationException
            var ex = Assert.Throws<InvalidOperationException>(() => tokenEntity.Use(now));
            Assert.Contains("already been used", ex.Message);
        }

        /// <summary>
        /// 3. Caducidad de Token (TTL).
        /// Verifica que un token cuya fecha de expiración haya pasado no sea válido para su uso.
        /// </summary>
        [Fact(DisplayName = "3. Caducidad de Token: Rechaza tokens con tiempo de expiración superado (15 minutos)")]
        public void PasswordResetToken_IsValid_ShouldBeFalseWhenExpired()
        {
            var userId = Guid.NewGuid();
            var (_, tokenEntity) = PasswordResetToken.Create(userId, TimeSpan.FromMinutes(5));

            DateTime future = DateTime.UtcNow.AddMinutes(10);
            Assert.True(tokenEntity.IsExpired(future));
            Assert.False(tokenEntity.IsValid(future));

            var ex = Assert.Throws<InvalidOperationException>(() => tokenEntity.Use(future));
            Assert.Contains("expired", ex.Message);
        }

        /// <summary>
        /// 4. Protección contra Enumeración de Usuarios (OWASP).
        /// Cuando un correo no existe, el endpoint responde éxito para no revelar si la cuenta existe en el sistema.
        /// </summary>
        [Fact(DisplayName = "4. Anti-Enumeración en Olvido: Usuario inexistente retorna éxito genérico (200 OK) sin crear token ni enviar correo")]
        public async Task ForgotPasswordCommand_WhenUserDoesNotExist_ShouldReturnSuccessWithoutRevealingAbsence()
        {
            _userRepositoryMock
                .Setup(r => r.GetByEmailAsync(It.IsAny<Email>()))
                .ReturnsAsync((User?)null);

            var handler = new ForgotPasswordCommandHandler(
                _userRepositoryMock.Object,
                _tokenRepositoryMock.Object,
                _emailSenderMock.Object,
                _unitOfWorkMock.Object,
                _configuration
            );

            var result = await handler.Handle(new ForgotPasswordCommand("nonexistent@zentric.local"), CancellationToken.None);

            Assert.True(result.IsSuccess);
            _tokenRepositoryMock.Verify(t => t.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Never);
            _emailSenderMock.Verify(e => e.SendPasswordResetEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// 5. Protección de Cuentas Bloqueadas.
        /// Un usuario con estado Bloqueado no puede recibir correos de restablecimiento para proteger la seguridad.
        /// </summary>
        [Fact(DisplayName = "5. Blindaje de Cuenta Bloqueada: Usuario bloqueado no recibe correo de recuperación pero retorna éxito genérico")]
        public async Task ForgotPasswordCommand_WhenUserIsBlocked_ShouldReturnSuccessWithoutSendingEmail()
        {
            var blockedUser = CreateTestUser("blocked@zentric.local", UserStatus.Blocked);
            _userRepositoryMock
                .Setup(r => r.GetByEmailAsync(It.IsAny<Email>()))
                .ReturnsAsync(blockedUser);

            var handler = new ForgotPasswordCommandHandler(
                _userRepositoryMock.Object,
                _tokenRepositoryMock.Object,
                _emailSenderMock.Object,
                _unitOfWorkMock.Object,
                _configuration
            );

            var result = await handler.Handle(new ForgotPasswordCommand("blocked@zentric.local"), CancellationToken.None);

            Assert.True(result.IsSuccess);
            _tokenRepositoryMock.Verify(t => t.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Never);
            _emailSenderMock.Verify(e => e.SendPasswordResetEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// 6. Flujo de Emisión de Token de Recuperación Válido.
        /// Usuario activo genera un token en BD, invalida cualquier token previo no usado y despacha el correo vía IEmailSender.
        /// </summary>
        [Fact(DisplayName = "6. Solicitud Válida de Recuperación: Usuario activo genera token, invalida tokens previos y envía enlace")]
        public async Task ForgotPasswordCommand_WhenUserExistsAndActive_ShouldCreateTokenAndSendEmail()
        {
            var activeUser = CreateTestUser("active@zentric.local", UserStatus.Active);
            _userRepositoryMock
                .Setup(r => r.GetByEmailAsync(It.IsAny<Email>()))
                .ReturnsAsync(activeUser);

            string capturedResetLink = string.Empty;
            _emailSenderMock
                .Setup(e => e.SendPasswordResetEmailAsync(activeUser.Email.Value, It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .Callback<string, string, CancellationToken>((_, link, _) => capturedResetLink = link)
                .Returns(Task.CompletedTask);

            var handler = new ForgotPasswordCommandHandler(
                _userRepositoryMock.Object,
                _tokenRepositoryMock.Object,
                _emailSenderMock.Object,
                _unitOfWorkMock.Object,
                _configuration
            );

            var result = await handler.Handle(new ForgotPasswordCommand("active@zentric.local"), CancellationToken.None);

            Assert.True(result.IsSuccess);
            _tokenRepositoryMock.Verify(t => t.InvalidateActiveTokensForUserAsync(activeUser.Id, It.IsAny<CancellationToken>()), Times.Once);
            _tokenRepositoryMock.Verify(t => t.AddAsync(It.Is<PasswordResetToken>(tok => tok.UserId == activeUser.Id), It.IsAny<CancellationToken>()), Times.Once);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
            _emailSenderMock.Verify(e => e.SendPasswordResetEmailAsync(activeUser.Email.Value, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);

            Assert.Contains("http://localhost:15434/restablecer-contrasena?token=", capturedResetLink);
            Assert.Contains($"email={Uri.EscapeDataString(activeUser.Email.Value)}", capturedResetLink);
        }

        /// <summary>
        /// 7. Validación de Token de Recuperación.
        /// Comprueba que un token activo y no expirado sea reconocido como válido por el query handler.
        /// </summary>
        [Fact(DisplayName = "7. Validación de Token: Token vigente y no quemado responde exitoso para restablecer clave")]
        public async Task ValidateResetTokenQuery_WhenTokenIsValid_ShouldReturnSuccess()
        {
            var userId = Guid.NewGuid();
            var (rawToken, tokenEntity) = PasswordResetToken.Create(userId, TimeSpan.FromMinutes(15));

            _tokenRepositoryMock
                .Setup(t => t.GetByTokenHashAsync(tokenEntity.TokenHash, It.IsAny<CancellationToken>()))
                .ReturnsAsync(tokenEntity);

            var handler = new ValidateResetTokenQueryHandler(_tokenRepositoryMock.Object);

            var result = await handler.Handle(new ValidateResetTokenQuery(rawToken), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.True(result.Value);
        }

        /// <summary>
        /// 8. Rechazo de Token Expirado o Usado.
        /// Un token previamente quemado debe rechazar la validación.
        /// </summary>
        [Fact(DisplayName = "8. Rechazo de Token Inválido: Token caducado o previamente utilizado retorna fallo")]
        public async Task ValidateResetTokenQuery_WhenTokenIsExpiredOrUsed_ShouldReturnFailure()
        {
            var userId = Guid.NewGuid();
            var (rawToken, tokenEntity) = PasswordResetToken.Create(userId, TimeSpan.FromMinutes(15));
            tokenEntity.Use(DateTime.UtcNow);

            _tokenRepositoryMock
                .Setup(t => t.GetByTokenHashAsync(tokenEntity.TokenHash, It.IsAny<CancellationToken>()))
                .ReturnsAsync(tokenEntity);

            var handler = new ValidateResetTokenQueryHandler(_tokenRepositoryMock.Object);

            var result = await handler.Handle(new ValidateResetTokenQuery(rawToken), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("expired or has already been used", result.Error);
        }

        /// <summary>
        /// 9. Ejecución de Cambio de Contraseña.
        /// Actualiza el hash PBKDF2 del usuario, marca el token como IsUsed y persiste atómicamente en BD.
        /// </summary>
        [Fact(DisplayName = "9. Restablecimiento Exitoso: Actualiza hash PBKDF2 de la clave en BD y quema el token atómicamente")]
        public async Task ResetPasswordCommand_WhenTokenAndUserValid_ShouldUpdateHashAndBurnToken()
        {
            var activeUser = CreateTestUser("buyer@zentric.local", UserStatus.Active);
            var (rawToken, tokenEntity) = PasswordResetToken.Create(activeUser.Id, TimeSpan.FromMinutes(15));

            _tokenRepositoryMock
                .Setup(t => t.GetByTokenHashAsync(tokenEntity.TokenHash, It.IsAny<CancellationToken>()))
                .ReturnsAsync(tokenEntity);

            _userRepositoryMock
                .Setup(u => u.GetByIdAsync(activeUser.Id))
                .ReturnsAsync(activeUser);

            _passwordHasherMock
                .Setup(h => h.Hash("NuevaClaveSegura2026!"))
                .Returns("hashed_new_password_abc");

            var handler = new ResetPasswordCommandHandler(
                _tokenRepositoryMock.Object,
                _userRepositoryMock.Object,
                _passwordHasherMock.Object,
                _unitOfWorkMock.Object
            );

            var result = await handler.Handle(new ResetPasswordCommand(rawToken, "NuevaClaveSegura2026!"), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal("hashed_new_password_abc", activeUser.PasswordHash);
            Assert.True(tokenEntity.IsUsed);

            _userRepositoryMock.Verify(u => u.UpdateAsync(activeUser), Times.Once);
            _tokenRepositoryMock.Verify(t => t.UpdateAsync(tokenEntity, It.IsAny<CancellationToken>()), Times.Once);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        /// <summary>
        /// 10. Validación de Longitud Mínima de Contraseña.
        /// Si la nueva contraseña tiene menos de 6 caracteres, la operación falla sin modificar nada en BD.
        /// </summary>
        [Fact(DisplayName = "10. Invariante de Longitud de Clave: Rechaza contraseñas menores a 6 caracteres sin tocar BD")]
        public async Task ResetPasswordCommand_WhenPasswordTooShort_ShouldFailWithoutUpdating()
        {
            var handler = new ResetPasswordCommandHandler(
                _tokenRepositoryMock.Object,
                _userRepositoryMock.Object,
                _passwordHasherMock.Object,
                _unitOfWorkMock.Object
            );

            var result = await handler.Handle(new ResetPasswordCommand("some_raw_token", "123"), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("at least 6 characters", result.Error);
            _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// 11. Reintento de Envío de Correo de Recuperación.
        /// Verifica que solicitudes consecutivas para el mismo usuario invaliden cualquier token activo anterior
        /// y despachen un nuevo correo con un token fresco e independiente.
        /// </summary>
        [Fact(DisplayName = "11. Reintento de Envío: Solicitudes consecutivas invalidan tokens anteriores y emiten un nuevo correo")]
        public async Task ForgotPasswordCommand_WhenUserRetriesRequest_InvalidatesPreviousTokensAndSendsSecondEmail()
        {
            var activeUser = CreateTestUser("buyer@zentric.local", UserStatus.Active);
            _userRepositoryMock
                .Setup(r => r.GetByEmailAsync(It.IsAny<Email>()))
                .ReturnsAsync(activeUser);

            var capturedLinks = new List<string>();
            _emailSenderMock
                .Setup(e => e.SendPasswordResetEmailAsync(activeUser.Email.Value, It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .Callback<string, string, CancellationToken>((_, link, _) => capturedLinks.Add(link))
                .Returns(Task.CompletedTask);

            var handler = new ForgotPasswordCommandHandler(
                _userRepositoryMock.Object,
                _tokenRepositoryMock.Object,
                _emailSenderMock.Object,
                _unitOfWorkMock.Object,
                _configuration
            );

            // Primer intento
            var firstResult = await handler.Handle(new ForgotPasswordCommand("buyer@zentric.local"), CancellationToken.None);
            Assert.True(firstResult.IsSuccess);

            // Reintento (segundo envío consecutivo)
            var retryResult = await handler.Handle(new ForgotPasswordCommand("buyer@zentric.local"), CancellationToken.None);
            Assert.True(retryResult.IsSuccess);

            // Se debe haber invalidado tokens anteriores 2 veces (una por cada intento)
            _tokenRepositoryMock.Verify(t => t.InvalidateActiveTokensForUserAsync(activeUser.Id, It.IsAny<CancellationToken>()), Times.Exactly(2));
            // Se debe haber agregado 2 tokens distintos
            _tokenRepositoryMock.Verify(t => t.AddAsync(It.Is<PasswordResetToken>(tok => tok.UserId == activeUser.Id), It.IsAny<CancellationToken>()), Times.Exactly(2));
            // Se debe haber enviado 2 correos
            _emailSenderMock.Verify(e => e.SendPasswordResetEmailAsync(activeUser.Email.Value, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Exactly(2));

            // Los enlaces deben ser distintos porque cada intento genera un token criptográfico nuevo
            Assert.Equal(2, capturedLinks.Count);
            Assert.NotEqual(capturedLinks[0], capturedLinks[1]);
        }
    }
}
