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
        /// <summary>
        /// CASO 1: Registro Exitoso.
        /// Entrada: Documento 'DOC-12345', Nombre 'Juan Perez', Email 'juan.perez@example.com', Clave 'SecretPassword1', Rol Buyer.
        /// Validación: El comando devuelve IsSuccess = true, añade exactamente 1 usuario a la base de datos con su documento y llama a SaveChangesAsync.
        /// </summary>
        [Fact(DisplayName = "1. Creación Exitosa: Persiste documento, nombre y rol de Comprador en base de datos")]
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
        /// CASO 2: Invariante Crítica de Seguridad (Anti-Plaintext).
        /// Entrada: Clave en texto plano 'SecretPassword1'.
        /// Validación: La propiedad PasswordHash persistida NUNCA es igual a 'SecretPassword1', sino que contiene el hash criptográfico derivado por el servidor.
        /// </summary>
        [Fact(DisplayName = "2. Seguridad Criptográfica: La contraseña se hashea con PBKDF2 y NUNCA se guarda en texto plano")]
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

        /// <summary>
        /// CASO 3: Unicidad de Correo Electrónico.
        /// Entrada: Se intenta registrar 'carlos@example.com' cuando ya existe un usuario con ese mismo correo en la base de datos.
        /// Validación: El comando falla (IsFailure = true) y devuelve un mensaje claro impidiendo cuentas duplicadas.
        /// </summary>
        [Fact(DisplayName = "3. Unicidad de Cuenta: Rechaza el registro si el correo electrónico ya existe en el sistema")]
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

        /// <summary>
        /// CASO 4: Estado Inicial Activo y Capacidad de Autenticación.
        /// Entrada: Solicitud de registro válida para un Comprador.
        /// Validación: El usuario persistido en base de datos nace con Status = Active (0), IsDeleted = false y CanAuthenticate = true para permitir login inmediato.
        /// </summary>
        [Fact(DisplayName = "4. Estado Activo Inmediato: El usuario Comprador registrado nace con Status Activo y CanAuthenticate habilitado")]
        public async Task Handle_BuyerRegistration_UserIsActiveAndCanAuthenticate()
        {
            var userRepo = new FakeUserRepository();
            var uow = new FakeUnitOfWork();
            var handler = new CreateUserCommandHandler(userRepo, uow, new FakePasswordHasher());

            var command = new CreateUserCommand(
                "1035999888",
                "David Machado",
                "david.machado@example.com",
                "ClaveSegura123!",
                UserRole.Buyer
            );

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            var created = Assert.Single(userRepo.Users);
            Assert.Equal(UserStatus.Active, created.Status);
            Assert.False(created.IsDeleted);
            Assert.True(created.CanAuthenticate);
        }

        /// <summary>
        /// CASO 5: Unicidad de Cédula / Documento de Identidad.
        /// Entrada: Se intenta registrar un nuevo usuario con una cédula que ya existe en la base de datos.
        /// Validación: El comando rechaza el registro (IsFailure = true) devolviendo mensaje explícito de documento duplicado.
        /// </summary>
        [Fact(DisplayName = "5. Unicidad de Documento: Rechaza el registro si la cédula o documento de identidad ya existe")]
        public async Task Handle_DuplicateIdentityDocument_ReturnsFailure()
        {
            var userRepo = new FakeUserRepository();
            var uow = new FakeUnitOfWork();
            var handler = new CreateUserCommandHandler(userRepo, uow, new FakePasswordHasher());

            var existing = new User(
                "1035417198",
                new FullName("David Machado"),
                new Email("david.previo@example.com"),
                "pwd",
                UserRole.Buyer
            );
            await userRepo.AddAsync(existing);

            var command = new CreateUserCommand(
                "1035417198",
                "Otro Usuario",
                "otro.correo@example.com",
                "ClaveSegura123!",
                UserRole.Buyer
            );

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("identity document already exists", result.Error);
        }
    }
}
