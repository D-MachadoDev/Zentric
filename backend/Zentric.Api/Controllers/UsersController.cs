using Zentric.Application.Common.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Security;
using Zentric.Application.Users.Commands;
using Zentric.Application.Users.Queries;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;

using Zentric.Api.Contracts;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Gestión de usuarios, participantes del marketplace y asignación de roles operativos.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    // Q-21: los listados de usuario exponen PII (documento de identidad y correo), asi que la
    // Ley los deja solo en manos del Administrador (seccion 5: "responsable de la administracion
    // de vendedores"). El Supervisor NO los lee: su "consulta y seguimiento operativo" (seccion
    // 5) no incluye datos personales. Cada usuario conserva su propia identidad por GET /auth/me.
    [Authorize(Policy = AuthorizationPolicies.UserAdministration)]
    [Tags("1. Usuarios y Roles")]
    [Produces("application/json")]
    public class UsersController : ControllerBase
    {
        private readonly IMediator _mediator;

        public UsersController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Registra un nuevo usuario en la plataforma Zentric.
        /// </summary>
        /// <remarks>
        /// <para>
        /// Excepcion justificada a RG-01, y la unica. Sin ella no existiria la
        /// primera cuenta: no se puede autenticar lo que todavia no se ha
        /// registrado. La excepcion se limita a lo que la propia Ley permite
        /// (auto-registro), no abre el registro general.
        /// </para>
        /// <para>
        /// <b>Buyer</b>: se puede registrar sin token. ZENTRIC.md incluye
        /// "Registro de compradores" entre los procesos del alcance.
        /// </para>
        /// <para>
        /// <b>Cualquier otro rol</b>: exige token de Administrador. ZENTRIC.md
        /// Dominio 3 dice que "los vendedores no pueden auto-registrarse; son
        /// incorporados por el Administrador", y la Matriz de Responsabilidades
        /// asigna "Registro Vendedores" solo al Admin. Extenderlo a
        /// Supervisor y LogisticsOperator es la lectura coherente de "ningun
        /// participante administrara informacion fuera de su rol" (RG-03).
        /// </para>
        /// </remarks>
        /// <param name="command">Datos de creación del usuario. La contraseña viaja en claro y la calcula el servidor (ADR-0009).</param>
        /// <response code="200">Usuario registrado con éxito. Retorna el identificador único (Guid) generado.</response>
        /// <response code="400">Error de validación o conflicto por correo/documento duplicado (RFC 7807 ProblemDetails).</response>
        /// <response code="401">Rol distinto de Buyer sin token de Administrador.</response>
        /// <response code="403">Rol distinto de Buyer con un token que no es de Administrador.</response>
        [HttpPost]
        [AllowAnonymous]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserCommand command)
        {
            // La unica excepcion a RG-01 es el auto-registro del comprador.
            if (command.Role != UserRole.Buyer && !IsAdministrator())
            {
                return Problem(
                    statusCode: StatusCodes.Status403Forbidden,
                    title: "Only an administrator can register this role",
                    detail: $"ZENTRIC.md, Dominio 3: los vendedores no pueden auto-registrarse. El rol '{command.Role}' solo puede ser creado por un Administrador.");
            }

            var result = await _mediator.Send(command);
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }

        private bool IsAdministrator()
        {
            return User.Identity?.IsAuthenticated == true
                && User.IsInRole(UserRole.Administrator.ToString());
        }

        /// <summary>
        /// Obtiene la lista de usuarios registrados, con filtro opcional por rol.
        /// </summary>
        /// <remarks>
        /// Permite al Administrador consultar todos los usuarios del sistema o filtrar por roles específicos como Vendor o Buyer.
        /// </remarks>
        /// <param name="role">Filtro opcional por rol de usuario (Buyer, Vendor, Admin, LogisticsOperator, Supervisor).</param>
        /// <response code="200">Lista de usuarios obtenida exitosamente.</response>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<UserDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetUsers([FromQuery] UserRole? role = null)
        {
            var result = await _mediator.Send(new GetUsersQuery(role));
            return Ok(result.Value);
        }

        /// <summary>
        /// Obtiene el detalle de un usuario registrado por su identificador único.
        /// </summary>
        /// <param name="id">Identificador único (Guid) del usuario.</param>
        /// <response code="200">Detalle del usuario obtenido exitosamente.</response>
        /// <response code="404">Usuario no encontrado (RFC 7807 ProblemDetails).</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetUserById(Guid id)
        {
            var result = await _mediator.Send(new GetUserByIdQuery(id));
            if (result.IsFailure) return result.ToProblem();
            return Ok(result.Value);
        }
    }
}
