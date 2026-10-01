using Zentric.Application.Common.Messaging;
using Microsoft.AspNetCore.Mvc;

namespace Zentric.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public abstract class ApiControllerBase : ControllerBase
    {
        private IMediator? _mediator;
        protected IMediator Mediator => _mediator ??= HttpContext.RequestServices.GetRequiredService<IMediator>();

        // No hay HandleResult aqui a proposito. Existio hasta el 2026-10-01 y era codigo muerto:
        // ningun controlador lo usaba, los 27 fallos de la capa de presentacion pasan por
        // ResultMapping.ToProblem(). Ademas estaba mal: leia result.IsSuccess pero ignoraba
        // result.ErrorKind y devolvia siempre 400, asi que un NotFound que hubiera pasado por ahi
        // habria respondido 400 en vez de 404, rompiendo el contrato de Q-21b. Se elimino para que
        // no vuelva a temptar a quien lo use creyendo que es la via correcta.
    }
}
