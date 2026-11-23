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
    /// Autenticacion de usuarios y emision de tokens JWT.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("0. Autenticacion")]
    [Produces("application/json")]
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
            // con el URI de ClaimTypes.Role. Ambas busquedas quedan aqui
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

        /// <summary>
        /// Solicita el restablecimiento de contraseña para un correo electrónico.
        /// Aplica respuesta uniforme (anti-enumeración de cuentas).
        /// </summary>
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ForgotPasswordResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var command = new ForgotPasswordCommand(request.Email);
            await _mediator.Send(command);

            return Ok(new ForgotPasswordResponse(
                "Si la dirección de correo electrónico está registrada, recibirás un enlace para restablecer tu contraseña."));
        }

        /// <summary>
        /// Valida la vigencia y existencia de un token de restablecimiento de contraseña.
        /// </summary>
        [HttpGet("validate-reset-token")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ValidateResetTokenResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ValidateResetToken([FromQuery] string token)
        {
            var query = new Zentric.Application.Users.Queries.ValidateResetTokenQuery(token);
            var result = await _mediator.Send(query);

            if (result.IsFailure)
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Token inválido o expirado",
                    Detail = result.Error,
                    Status = StatusCodes.Status400BadRequest
                });
            }

            return Ok(new ValidateResetTokenResponse(true));
        }

        /// <summary>
        /// Restablece la contraseña de un usuario consumiendo un token válido de un solo uso.
        /// </summary>
        [HttpPost("reset-password")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ResetPasswordResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var command = new ResetPasswordCommand(request.Token, request.NewPassword);
            var result = await _mediator.Send(command);

            if (result.IsFailure)
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Error al restablecer contraseña",
                    Detail = result.Error,
                    Status = StatusCodes.Status400BadRequest
                });
            }

            return Ok(new ResetPasswordResponse("Tu contraseña ha sido actualizada exitosamente."));
        }
    }

    /// <summary>Identidad declarada por el token vigente.</summary>
    public sealed record CurrentUserResponse(string UserId, string Email, string FullName, string Role);

    public sealed record ForgotPasswordRequest(string Email);
    public sealed record ForgotPasswordResponse(string Message);
    public sealed record ValidateResetTokenResponse(bool Valid);
    public sealed record ResetPasswordRequest(string Token, string NewPassword);
    public sealed record ResetPasswordResponse(string Message);
}
