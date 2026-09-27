using Zentric.Application.Common.Messaging;
using Microsoft.AspNetCore.Mvc;
using Zentric.Application.Users.Commands;
using Zentric.Application.Users.Queries;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Gestión de usuarios, participantes del marketplace y asignación de roles operativos.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("1. Usuarios y Roles")]
    [Produces("application/json", "application/problem+json")]
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
        /// Valida de forma asíncrona la unicidad del correo electrónico y del documento de identificación fiscal/nacional (IdentityDocument).
        /// Asigna el rol inicial del participante (Buyer, Vendor, Admin, LogisticsOperator, Supervisor) según las reglas de negocio de ZENTRIC.md, sección 5.
        /// </remarks>
        /// <param name="command">Datos de creación del usuario (nombre, correo, rol y documento de identidad).</param>
        /// <response code="200">Usuario registrado con éxito. Retorna el identificador único (Guid) generado.</response>
        /// <response code="400">Error de validación o conflicto por correo/documento duplicado (RFC 7807 ProblemDetails).</response>
        [HttpPost]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserCommand command)
        {
            var result = await _mediator.Send(command);
            if (result.IsFailure) return BadRequest(new ProblemDetails { Detail = result.Error });
            return Ok(result.Value);
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
            if (result.IsFailure) return NotFound(new ProblemDetails { Detail = result.Error });
            return Ok(result.Value);
        }
    }
}
