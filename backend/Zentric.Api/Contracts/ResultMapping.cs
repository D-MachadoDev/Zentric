using Microsoft.AspNetCore.Mvc;
using Zentric.Application.Common.Models;

namespace Zentric.Api.Contracts
{
    /// <summary>
    /// Traduce un <see cref="Result"/> fallido a la respuesta HTTP.
    ///
    /// Q-21b: el codigo lo decide la <see cref="ErrorKind"/> del fallo, no el texto
    /// del mensaje. Concentrarlo aqui evita que cada controlador invente su propio
    /// criterio y que un "no encontrado" vuelva a salir como 400 en la siguiente
    ///.endpoint.
    ///
    /// Reglas:
    /// - <see cref="ErrorKind.NotFound"/> -> 404. Cubre "no existe" y "es de otro",
    ///   con el mismo mensaje, para que el cliente no pueda enumerar GUID ajenos.
    /// - <see cref="ErrorKind.Validation"/> -> 400. Regla de negocio o dato invalido.
    /// </summary>
    public static class ResultMapping
    {
        public static IActionResult ToProblem(this Result result)
        {
            var problem = new ProblemDetails { Detail = result.Error };

            return result.ErrorKind == ErrorKind.NotFound
                ? new NotFoundObjectResult(problem)
                : new BadRequestObjectResult(problem);
        }
    }
}
