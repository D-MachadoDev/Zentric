using System;
using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Zentric.Api.Security;
using Microsoft.AspNetCore.Mvc;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Users.Commands;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Autenticacion de usuarios. Introduce RG-01 ("toda operacion debe
    /// ejecutarse por un usuario autenticado"), segun ADR-0009.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("0. Autenticacion")]
    [Produces("application/json", "application/problem+json")]
    public class AuthController : ControllerBase
    {
        private readonly IMediator _mediator;

        public AuthController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Autentica un usuario con correo y contrasena y devuelve el token de sesion.
        /// </summary>
        /// <remarks>
        /// Es la unica operacion de negocio accesible sin token: sin ella no habria
        /// forma de obtenerlo. Cualquier fallo (correo inexistente, contrasena
        /// incorrecta, usuario bloqueado o eliminado) responde <c>401</c> con el
        /// mismo mensaje, para no revelar que cuentas estan registradas.
        /// </remarks>
        /// <param name="command">Correo y contrasena en claro.</param>
        /// <response code="200">Autenticacion correcta. Devuelve token, caducidad e identidad.</response>
        /// <response code="400">El correo no tiene un formato valido.</response>
        /// <response code="401">Credenciales invalidas, o usuario bloqueado o eliminado.</response>
        [HttpPost("login")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login([FromBody] LoginCommand command)
        {
            var result = await _mediator.Send(command);

            if (result.IsFailure)
            {
                return Unauthorized(new ProblemDetails
                {
                    Title = "Authentication failed",
                    Detail = result.Error,
                    Status = StatusCodes.Status401Unauthorized
                });
            }

            return Ok(result.Value);
        }

        /// <summary>
        /// Devuelve la identidad que el token vigente declara.
        /// </summary>
        /// <remarks>
        /// No consulta la base de datos: responde con los claims del token ya
        /// validado. Sirve para que el cliente confirme su sesion al arrancar sin
        /// tener que guardar el token en algun sitio aparte.
        /// </remarks>
        /// <response code="200">Identidad del token vigente.</response>
        /// <response code="401">Token ausente, invalido o caducado.</response>
        [HttpGet("me")]
        [Authorize(Policy = AuthorizationPolicies.AnyAuthenticatedUser)]
        [ProducesResponseType(typeof(CurrentUserResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public IActionResult Me()
        {
            var principal = User;

            // Las claims se buscan primero por su nombre literal: el validador de
            // .NET 10 no reescribe los tipos de claim entrantes, y el rol se emite
            // con el URI de ClaimTypes.Role (ADR-0009). Ambas busquedas quedan aqui
            // para que el contrato no dependa de que el mapeo este activo o no.
            return Ok(new CurrentUserResponse(
                principal.FindFirst("sub")?.Value ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty,
                principal.FindFirst(ClaimTypes.Email)?.Value
                    ?? principal.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email)?.Value
                    ?? string.Empty,
                principal.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Name)?.Value
                    ?? principal.FindFirst(ClaimTypes.Name)?.Value
                    ?? principal.Identity?.Name
                    ?? string.Empty,
                principal.FindFirst("role")?.Value
                    ?? principal.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty));
        }
    }

    /// <summary>Identidad declarada por el token vigente.</summary>
    public sealed record CurrentUserResponse(string UserId, string Email, string FullName, string Role);
}
