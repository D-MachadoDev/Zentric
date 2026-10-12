using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Users.Commands;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Tests.Application.Users
{
    /// <summary>
    /// Criterios de aceptacion de INV-05 (bloqueo y reactivacion de usuario).
    ///
    /// La Ley (ZENTRIC.md, Dominio 1) dice que el estado del usuario es "Activo,
    /// Bloqueado, etc." pero no dice quien lo bloquea ni si es reversible: el dictamen
    /// Q-26 del Owner fija que el comando vive en <c>POST /api/users/{id}/block</c>
    /// con la politica <c>UserAdministration</c> (solo Administrador) y que la
    /// reactivacion es su inversa, porque sin ella un error del Administrador seria
    /// irreversible.
    /// </summary>
    public class BlockActivateUserCommandHandlerTests
    {
        private static User AnyUser(UserRole role = UserRole.Seller)
        {
            return new User(
                "DOC-99887",
                new FullName("Vendedor", "De Prueba"),
                new Email("vendedor@example.com"),
                "hashed::secret",
                role);
        }

        [Fact]
        public async Task BlockUser_UnknownUser_ReturnsNotFound()
        {
            var repository = new FakeUserRepository();
            var unitOfWork = new FakeUnitOfWork();
            var handler = new BlockUserCommandHandler(repository, unitOfWork);

            var result = await handler.Handle(new BlockUserCommand(Guid.NewGuid()), CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Equal(Zentric.Application.Common.Models.ErrorKind.NotFound, result.ErrorKind);
            Assert.False(unitOfWork.SaveChangesCalled);
        }

        /// <summary>
        /// INV-05: bloquear cierra el acceso. El cambio tiene que persistirse, porque
        /// es lo que hace que <c>User.CanAuthenticate</c> falle y por tanto que el
        /// login rechace al usuario (LoginCommandHandler).
        /// </summary>
        [Fact]
        public async Task BlockUser_ActiveUser_BlocksPersistsAndClosesAccess()
        {
            var repository = new FakeUserRepository();
            var unitOfWork = new FakeUnitOfWork();
            var user = AnyUser();
            await repository.AddAsync(user);
            var handler = new BlockUserCommandHandler(repository, unitOfWork);

            var result = await handler.Handle(new BlockUserCommand(user.Id), CancellationToken.None);

            Assert.True(result.IsSuccess, result.Error);
            Assert.Equal(UserStatus.Blocked, user.Status);
            Assert.False(user.CanAuthenticate);
            Assert.True(unitOfWork.SaveChangesCalled);
        }

        /// <summary>
        /// El agregado rechaza bloquear dos veces; la guarda debe salir como 400 y no
        /// propagarse al middleware global como 500.
        /// </summary>
        [Fact]
        public async Task BlockUser_AlreadyBlocked_ReturnsValidationFailure()
        {
            var repository = new FakeUserRepository();
            var user = AnyUser();
            user.Block();
            await repository.AddAsync(user);
            var handler = new BlockUserCommandHandler(repository, new FakeUnitOfWork());

            var result = await handler.Handle(new BlockUserCommand(user.Id), CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Equal(Zentric.Application.Common.Models.ErrorKind.Validation, result.ErrorKind);
            Assert.Contains("already blocked", result.Error);
        }

        /// <summary>
        /// INV-05, decision del Owner 2026-10-04: bloquear no cascadea. Los productos
        /// del Vendedor siguen Published y lo unico que cambia es su propio acceso.
        /// </summary>
        [Fact]
        public async Task BlockUser_DoesNotCascadeIntoProducts()
        {
            var repository = new FakeUserRepository();
            var user = AnyUser();
            await repository.AddAsync(user);
            var handler = new BlockUserCommandHandler(repository, new FakeUnitOfWork());

            await handler.Handle(new BlockUserCommand(user.Id), CancellationToken.None);

            Assert.Equal(UserStatus.Blocked, user.Status);
            // No existe evento de usuario que pudiera arrastrar al catalogo:
            // User no hereda de Entity y no emite nada.
            Assert.False(user.CanAuthenticate);
        }

        [Fact]
        public async Task BlockUser_DeletedUser_ReturnsValidationFailure()
        {
            var repository = new FakeUserRepository();
            var user = AnyUser();
            user.DeleteByAdmin();
            await repository.AddAsync(user);
            var handler = new BlockUserCommandHandler(repository, new FakeUnitOfWork());

            var result = await handler.Handle(new BlockUserCommand(user.Id), CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Contains("deleted", result.Error);
        }

        [Fact]
        public async Task ActivateUser_UnknownUser_ReturnsNotFound()
        {
            var handler = new ActivateUserCommandHandler(new FakeUserRepository(), new FakeUnitOfWork());

            var result = await handler.Handle(new ActivateUserCommand(Guid.NewGuid()), CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Equal(Zentric.Application.Common.Models.ErrorKind.NotFound, result.ErrorKind);
        }

        [Fact]
        public async Task ActivateUser_BlockedUser_RestoresAccessAndSaves()
        {
            var repository = new FakeUserRepository();
            var unitOfWork = new FakeUnitOfWork();
            var user = AnyUser();
            user.Block();
            await repository.AddAsync(user);
            var handler = new ActivateUserCommandHandler(repository, unitOfWork);

            var result = await handler.Handle(new ActivateUserCommand(user.Id), CancellationToken.None);

            Assert.True(result.IsSuccess, result.Error);
            Assert.Equal(UserStatus.Active, user.Status);
            Assert.True(user.CanAuthenticate);
            Assert.True(unitOfWork.SaveChangesCalled);
        }

        [Fact]
        public async Task ActivateUser_AlreadyActive_ReturnsValidationFailure()
        {
            var repository = new FakeUserRepository();
            var user = AnyUser();
            await repository.AddAsync(user);
            var handler = new ActivateUserCommandHandler(repository, new FakeUnitOfWork());

            var result = await handler.Handle(new ActivateUserCommand(user.Id), CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Equal(Zentric.Application.Common.Models.ErrorKind.Validation, result.ErrorKind);
            Assert.Contains("already active", result.Error);
        }
    }
}
