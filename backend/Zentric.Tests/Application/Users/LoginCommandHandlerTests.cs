using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Users.Commands;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;
using Zentric.Tests.Application.Users;

namespace Zentric.Tests.Application.Users
{
    /// <summary>
    /// Criterios de aceptacion de <c>POST /api/auth/login</c> (ADR-0009).
    /// </summary>
    public class LoginCommandHandlerTests
    {
        private static User RegisteredUser(string email = "juan@example.com", string password = "SecretPassword1")
        {
            var hasher = new Pbkdf2PasswordHasherForTests();
            return new User(
                "DOC-12345",
                new FullName("Juan Perez"),
                new Email(email),
                hasher.Hash(password),
                UserRole.Buyer);
        }

        /// <summary>
        /// Extremo barato del puerto: la criptografia real ya se prueba en
        /// <c>Pbkdf2PasswordHasherTests</c>. Aqui importa la orquestacion.
        /// </summary>
        private sealed class Pbkdf2PasswordHasherForTests : IPasswordHasher
        {
            public string Hash(string password) => $"test::{password}";
            public bool Verify(string password, string storedHash) => storedHash == $"test::{password}";
        }

        private sealed class FakeTokenService : IAuthTokenService
        {
            public AuthToken Issue(Guid userId, string email, string fullName, UserRole role)
                => new($"token-for-{userId}", DateTimeOffset.UtcNow.AddHours(1));
        }

        [Fact]
        public async Task Handle_ValidCredentials_ReturnsTokenAndIdentity()
        {
            var repo = new FakeUserRepository();
            await repo.AddAsync(RegisteredUser());
            var handler = new LoginCommandHandler(repo, new Pbkdf2PasswordHasherForTests(), new FakeTokenService());

            var result = await handler.Handle(new LoginCommand("juan@example.com", "SecretPassword1"), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.StartsWith("token-for-", result.Value.Token, StringComparison.Ordinal);
            Assert.Equal("juan@example.com", result.Value.Email);
            Assert.Equal("Buyer", result.Value.Role);
        }

        [Fact]
        public async Task Handle_ValidCredentials_IsCaseInsensitiveOnEmail()
        {
            // El value object Email normaliza a minusculas, asi que el acceso no
            // puede depender de como el usuario lo escribio.
            var repo = new FakeUserRepository();
            await repo.AddAsync(RegisteredUser());
            var handler = new LoginCommandHandler(repo, new Pbkdf2PasswordHasherForTests(), new FakeTokenService());

            var result = await handler.Handle(new LoginCommand("JUAN@EXAMPLE.COM", "SecretPassword1"), CancellationToken.None);

            Assert.True(result.IsSuccess);
        }

        [Fact]
        public async Task Handle_WrongPassword_FailsWithGenericMessage()
        {
            var repo = new FakeUserRepository();
            await repo.AddAsync(RegisteredUser());
            var handler = new LoginCommandHandler(repo, new Pbkdf2PasswordHasherForTests(), new FakeTokenService());

            var result = await handler.Handle(new LoginCommand("juan@example.com", "WrongPassword1"), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Invalid email or password.", result.Error);
        }

        [Fact]
        public async Task Handle_UnknownEmail_FailsWithTheSameMessageAsAWrongPassword()
        {
            // Si los dos casos tuvieran mensajes distintos, permitirian enumerar
            // las cuentas registradas probando correos.
            var repo = new FakeUserRepository();
            var handler = new LoginCommandHandler(repo, new Pbkdf2PasswordHasherForTests(), new FakeTokenService());

            var unknown = await handler.Handle(new LoginCommand("nadie@example.com", "SecretPassword1"), CancellationToken.None);

            Assert.True(unknown.IsFailure);
            Assert.Equal("Invalid email or password.", unknown.Error);
        }

        [Fact]
        public async Task Handle_BlockedUser_IsRejected()
        {
            var repo = new FakeUserRepository();
            var user = RegisteredUser();
            user.Block();
            await repo.AddAsync(user);
            var handler = new LoginCommandHandler(repo, new Pbkdf2PasswordHasherForTests(), new FakeTokenService());

            var result = await handler.Handle(new LoginCommand("juan@example.com", "SecretPassword1"), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Invalid email or password.", result.Error);
        }

        [Fact]
        public async Task Handle_MalformedEmail_FailsWithoutThrowing()
        {
            var repo = new FakeUserRepository();
            var handler = new LoginCommandHandler(repo, new Pbkdf2PasswordHasherForTests(), new FakeTokenService());

            var result = await handler.Handle(new LoginCommand("no-es-un-correo", "SecretPassword1"), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Invalid email or password.", result.Error);
        }
    }
}
