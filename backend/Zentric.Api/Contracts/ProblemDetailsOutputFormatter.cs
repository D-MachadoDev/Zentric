using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Zentric.Api.Contracts
{
    /// <summary>
    /// Hace que toda respuesta con cuerpo <see cref="ProblemDetails"/> salga como
    /// <c>application/problem+json</c> (RFC 7807/9457, exigido por AGENTS.md seccion 3.4).
    ///
    /// Por que un formateador y no un filtro: con un filtro solo, ajustar <c>ContentTypes</c> no
    /// basta. Cuando el cliente NO envia cabecera <c>Accept</c> (como hace <c>HttpClient</c>), la
    /// negociacion descarta los tipos declarados y usa el primero que sepa el formateador. Se
    /// comprobó en la suite E2E: el filtro se registraba y su mutacion era correcta, y la respuesta
    /// seguia saliendo <c>application/json</c>. Insertar este formateador DELANTE del de JSON lo
    /// convierte en el primero que acepta un <c>ProblemDetails</c>, y ahi si decide el tipo.
    ///
    /// Y por que no serializa el problema a mano: la primera version de este arreglo escribia el
    /// cuerpo con <c>JsonSerializer</c> y eso devolvia <c>Detail</c> y <c>Errors</c> en PascalCase,
    /// rompiendo el contrato que el frontend ya consume en minuscula. Delegando en las opciones de
    /// JSON de MVC, el cuerpo sale exactamente igual que antes y lo unico que cambia es la cabecera.
    /// </summary>
    public sealed class ProblemDetailsOutputFormatter : OutputFormatter
    {
        private const string MediaType = "application/problem+json";

        public ProblemDetailsOutputFormatter() => SupportedMediaTypes.Add(MediaType);

        protected override bool CanWriteType(Type? type) =>
            type is not null && typeof(ProblemDetails).IsAssignableFrom(type);

        public override async Task WriteResponseBodyAsync(OutputFormatterWriteContext context)
        {
            // Se resuelven aqui, no en el constructor: MvcOptions se configuran mientras se
            // construye el host y pedir JsonOptions en ese momento abriria un ciclo de DI.
            var options = context.HttpContext.RequestServices.GetRequiredService<IOptions<JsonOptions>>();

            var response = context.HttpContext.Response;
            response.ContentType = $"{MediaType}; charset=utf-8";

            await JsonSerializer.SerializeAsync(
                response.Body,
                context.Object,
                options.Value.JsonSerializerOptions,
                cancellationToken: context.HttpContext.RequestAborted);
        }
    }

    public static class ProblemDetailsContract
    {
        /// <summary>
        /// Registra el contrato de error. Unico punto de alta: quien agregue otro formateador por su
        /// cuenta vuelve a partir el contrato por la mitad.
        /// </summary>
        public static IMvcBuilder AddProblemDetailsContract(this IMvcBuilder builder)
        {
            builder.Services.Configure<MvcOptions>(options =>
                options.OutputFormatters.Insert(0, new ProblemDetailsOutputFormatter()));

            return builder;
        }
    }
}