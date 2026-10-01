using Xunit;
using Zentric.Application.Common.Behaviors;
using Zentric.Application.Common.Models;
using Zentric.Application.Orders.Commands;
using Zentric.Application.Orders.Validators;

namespace Zentric.Tests.UseCases
{
    /// <summary>
    /// Comportamiento del pipeline de validación de MediatR (AGENTS.md, secciones 3.2 y 4.3,
    /// backendSDD/Application/01-use-cases-and-ports.md, sección 1): una entrada inválida devuelve un
    /// fallo de negocio y **no** invoca el handler; una entrada válida lo invoca.
    /// </summary>
    public class ValidationBehaviorTests
    {
        [Fact]
        public async Task Handle_InvalidTypedRequest_ReturnsFailureWithoutInvokingHandler()
        {
            var behavior = new ValidationBehavior<CreateCartCommand, Result<Guid>>(
                new[] { new CreateCartCommandValidator() });
            var handlerInvoked = false;

            var result = await behavior.Handle(
                new CreateCartCommand(Guid.Empty),
                () =>
                {
                    handlerInvoked = true;
                    return Task.FromResult(Result<Guid>.Success(Guid.NewGuid()));
                },
                CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("BuyerId is required.", result.Error);
            Assert.False(handlerInvoked);
            Assert.Throws<InvalidOperationException>(() => { _ = result.Value; });
        }

        [Fact]
        public async Task Handle_InvalidResultRequest_ReturnsFailureWithoutInvokingHandler()
        {
            var behavior = new ValidationBehavior<AddOrderItemCommand, Result>(
                new[] { new AddOrderItemCommandValidator() });
            var handlerInvoked = false;

            var result = await behavior.Handle(
                new AddOrderItemCommand(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 0, 10m, "COP", Guid.NewGuid()),
                () =>
                {
                    handlerInvoked = true;
                    return Task.FromResult(Result.Success());
                },
                CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("Quantity must be greater than zero.", result.Error);
            Assert.False(handlerInvoked);
        }

        [Fact]
        public async Task Handle_ValidRequest_InvokesHandlerAndReturnsSuccess()
        {
            var behavior = new ValidationBehavior<CreateCartCommand, Result<Guid>>(
                new[] { new CreateCartCommandValidator() });
            var expected = Guid.NewGuid();
            var handlerInvoked = false;

            var result = await behavior.Handle(
                new CreateCartCommand(Guid.NewGuid()),
                () =>
                {
                    handlerInvoked = true;
                    return Task.FromResult(Result<Guid>.Success(expected));
                },
                CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(expected, result.Value);
            Assert.True(handlerInvoked);
        }

        [Fact]
        public async Task Handle_RequestWithoutValidators_InvokesHandler()
        {
            var behavior = new ValidationBehavior<CreateCartCommand, Result<Guid>>(
                Array.Empty<CreateCartCommandValidator>());
            var handlerInvoked = false;

            var result = await behavior.Handle(
                new CreateCartCommand(Guid.Empty),
                () =>
                {
                    handlerInvoked = true;
                    return Task.FromResult(Result<Guid>.Success(Guid.NewGuid()));
                },
                CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.True(handlerInvoked);
        }
    }
}