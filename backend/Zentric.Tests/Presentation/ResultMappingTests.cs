using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Contracts;
using Zentric.Application.Common.Models;
using Xunit;

namespace Zentric.Tests.Presentation
{
    /// <summary>
    /// Traduccion de un fallo a respuesta HTTP (dictamen del Owner sobre Q-21b).
    ///
    /// La regla es una sola: un recurso ausente o ajeno responde 404 y una regla de
    /// negocio responde 400. El codigo sale de la <see cref="ErrorKind"/> del fallo,
    /// nunca de leer el texto del mensaje.
    /// </summary>
    public class ResultMappingTests
    {
        [Fact]
        public void ToProblem_NotFound_Returns404()
        {
            var result = Result<int>.NotFound("Order with ID abc not found.");

            var action = result.ToProblem();

            var notFound = Assert.IsType<NotFoundObjectResult>(action);
            Assert.Equal(404, notFound.StatusCode);
            var problem = Assert.IsType<ProblemDetails>(notFound.Value);
            Assert.Equal("Order with ID abc not found.", problem.Detail);
        }

        [Fact]
        public void ToProblem_Validation_Returns400()
        {
            var result = Result<int>.Failure("Not enough available stock.");

            var action = result.ToProblem();

            var badRequest = Assert.IsType<BadRequestObjectResult>(action);
            Assert.Equal(400, badRequest.StatusCode);
        }

        /// <summary>
        /// El motivo de que el mapa exista: si cada controlador eligiera el codigo,
        /// un "not found" volveria a salir como 400 en cuanto alguien escribiera la
        /// respuesta a mano. Esta prueba falla en cuanto aparece un
        /// <c>return BadRequest(new ProblemDetails { Detail = result.Error })</c>
        /// o un <c>return NotFound(...)</c> escrito a mano en la capa de presentacion.
        /// </summary>
        [Fact]
        public void Controllers_DoNotHandcraftTheFailureCode()
        {
            var controllerDir = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Zentric.Api", "Controllers");
            controllerDir = Path.GetFullPath(controllerDir);
            Assert.True(Directory.Exists(controllerDir), $"No se encontro el directorio de controladores: {controllerDir}");

            var offenders = Directory.GetFiles(controllerDir, "*.cs", SearchOption.AllDirectories)
                .SelectMany(file => File.ReadAllLines(file)
                    .Select((line, index) => new { File = Path.GetFileName(file), Line = index + 1, Text = line }))
                .Where(x => x.Text.Contains(".IsFailure)") &&
                            (x.Text.Contains("return BadRequest(") || x.Text.Contains("return NotFound(")))
                .Select(x => $"{x.File}:{x.Line}")
                .ToList();

            Assert.True(
                offenders.Count == 0,
                "Estos controladores eligen el codigo HTTP a mano en vez de usar ToProblem(): "
                + string.Join(", ", offenders));
        }
    }
}
