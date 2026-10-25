using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Application.Users.Commands;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Tests.Application.Users
{
    public class FakeUnitOfWork : IUnitOfWork
    {
        public bool SaveChangesCalled { get; private set; }
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveChangesCalled = true;
            return Task.FromResult(1);
        }
    }

    public class FakeUserRepository : IUserRepository
    {
        public List<User> Users { get; } = new();

        public Task<User?> GetByIdAsync(Guid id)
        {
            return Task.FromResult(Users.FirstOrDefault(u => u.Id == id));
        }

        public Task<User?> GetByEmailAsync(Email email)
        {
            return Task.FromResult(Users.FirstOrDefault(u => u.Email.Equals(email)));
        }

        public Task<IReadOnlyList<User>> GetAllAsync(Zentric.Domain.Users.Enums.UserRole? role = null, CancellationToken cancellationToken = default)
        {
            var res = role.HasValue ? Users.Where(u => u.Role == role.Value).ToList() : Users.ToList();
            return Task.FromResult<IReadOnlyList<User>>(res);
        }

        public Task<bool> IsEmailUniqueAsync(Email email, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(!Users.Any(u => u.Email.Equals(email)));
        }

        public Task<bool> IsIdentityDocumentUniqueAsync(string identityDocument, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(!Users.Any(u => u.IdentityDocument == identityDocument));
        }

        public Task AddAsync(User user)
        {
            Users.Add(user);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(User user)
        {
            return Task.CompletedTask;
        }
    }

    /// <summary>
    /// Sustituto determinista del hasher real. Las pruebas de este archivo
    /// verifican orquestacion (unicidad, guardado), no criptografia: el
    /// comportamiento criptografico se prueba en <c>Pbkdf2PasswordHasherTests</c>.
    /// </summary>
    public class FakePasswordHasher : IPasswordHasher
    {
        public string Hash(string password) => $"hashed::{password}";
        public bool Verify(string password, string storedHash) => storedHash == Hash(password);
    }

    public class CreateUserCommandHandlerTests
    {
        [Fact]
        public async Task Handle_ValidCommand_CreatesUserAndSaves()
        {
            var userRepo = new FakeUserRepository();
            var uow = new FakeUnitOfWork();
            var handler = new CreateUserCommandHandler(userRepo, uow, new FakePasswordHasher());

            var command = new CreateUserCommand(
                "DOC-12345",
                "Juan Perez",
                "juan.perez@example.com",
                "SecretPassword1",
                UserRole.Buyer
            );

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(userRepo.Users);
            Assert.Equal("DOC-12345", userRepo.Users[0].IdentityDocument);
            Assert.True(uow.SaveChangesCalled);
        }

        /// <summary>
        /// ADR-0009: el cliente ya no envia el hash, envia la contrasena. El
        /// servidor es quien deriva el valor, asi que lo persistido nunca puede
        /// ser la contrasena en claro.
        /// </summary>
        [Fact]
        public async Task Handle_ValidCommand_PersistsHashedPasswordNotPlaintext()
        {
            var userRepo = new FakeUserRepository();
            var uow = new FakeUnitOfWork();
            var handler = new CreateUserCommandHandler(userRepo, uow, new FakePasswordHasher());

            var command = new CreateUserCommand(
                "DOC-12345",
                "Juan Perez",
                "juan.perez@example.com",
                "SecretPassword1",
                UserRole.Buyer
            );

            await handler.Handle(command, CancellationToken.None);

            string stored = userRepo.Users[0].PasswordHash;
            Assert.NotEqual("SecretPassword1", stored);
            Assert.Equal("hashed::SecretPassword1", stored);
        }

        [Fact]
        public async Task Handle_DuplicateEmail_ReturnsFailure()
        {
            var userRepo = new FakeUserRepository();
            var uow = new FakeUnitOfWork();
            var handler = new CreateUserCommandHandler(userRepo, uow, new FakePasswordHasher());

            var existingUser = new User(
                "DOC-99999",
                new FullName("Carlos Gomez"),
                new Email("carlos@example.com"),
                "pwd",
                UserRole.Seller
            );
            await userRepo.AddAsync(existingUser);

            var command = new CreateUserCommand(
                "DOC-11111",
                "Carlos Gomez",
                "carlos@example.com",
                "pwd",
                UserRole.Seller
            );

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("already exists", result.Error);
        }
    }
}
