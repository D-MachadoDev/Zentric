using System.Reflection;
using FluentValidation;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;

namespace Zentric.Application.Common.Behaviors
{
    /// <summary>
    /// Ejecuta los validadores FluentValidation de un comando antes de invocar su handler.
    /// Si la entrada no es válida devuelve un fallo de negocio (<see cref="Result"/>.Failure)
    /// en lugar de lanzar excepciones, según AGENTS.md, secciones 3.2 y 4.3 y
    /// backendSDD/Application/01-use-cases-and-ports.md, secciones 1 y 7.
    /// </summary>
    public sealed class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
        where TRequest : IRequest<TResponse>
        where TResponse : Result
    {
        private readonly IEnumerable<IValidator<TRequest>> _validators;

        public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
        {
            _validators = validators;
        }

        public async Task<TResponse> Handle(
            TRequest request,
            RequestHandlerDelegate<TResponse> next,
            CancellationToken cancellationToken)
        {
            var errors = await ValidationRunner.RunAsync(_validators, request, cancellationToken);

            if (errors is null)
            {
                return await next();
            }

            return BuildFailure(errors);
        }

        // Los comandos responden Result o Result<T> (tipos distintos) y el comportamiento debe
        // devolver exactamente el tipo que espera el handler, por lo que se invoca la fábrica
        // estática Result<T>.Failure del tipo concreto.
        private static TResponse BuildFailure(string errors)
        {
            if (typeof(TResponse) == typeof(Result))
            {
                return (TResponse)(object)Result.Failure(errors);
            }

            var valueType = typeof(TResponse).GetGenericArguments()[0];
            var failureFactory = typeof(Result<>)
                .MakeGenericType(valueType)
                .GetMethod(nameof(Result<object>.Failure), BindingFlags.Public | BindingFlags.Static)!;

            return (TResponse)failureFactory.Invoke(null, new object[] { errors })!;
        }
    }

    /// <summary>Utilidades compartidas por el pipeline de validación.</summary>
    internal static class ValidationRunner
    {
        /// <summary>
        /// Ejecuta todos los validadores del request y devuelve los mensajes de error
        /// agregados, o <c>null</c> cuando la entrada es válida.
        /// </summary>
        public static async Task<string?> RunAsync<TRequest>(
            IEnumerable<IValidator<TRequest>> validators,
            TRequest request,
            CancellationToken cancellationToken)
        {
            var validatorList = validators as IReadOnlyList<IValidator<TRequest>> ?? validators.ToList();
            if (validatorList.Count == 0)
            {
                return null;
            }

            var context = new ValidationContext<TRequest>(request);
            var results = await Task.WhenAll(
                validatorList.Select(validator => validator.ValidateAsync(context, cancellationToken)));

            var messages = results
                .SelectMany(result => result.Errors)
                .Where(failure => failure is not null)
                .Select(failure => failure.ErrorMessage)
                .ToArray();

            return messages.Length == 0 ? null : string.Join(" ", messages);
        }
    }
}
