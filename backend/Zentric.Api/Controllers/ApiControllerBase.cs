using MediatR;
using Microsoft.AspNetCore.Mvc;
using Zentric.Application.Common.Models;

namespace Zentric.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public abstract class ApiControllerBase : ControllerBase
    {
        private ISender? _mediator;
        protected ISender Mediator => _mediator ??= HttpContext.RequestServices.GetRequiredService<ISender>();

        protected IActionResult HandleResult(Result result)
        {
            if (result.IsSuccess)
            {
                return Ok();
            }

            return BadRequest(new ProblemDetails
            {
                Title = "A business rule was violated",
                Detail = result.Error,
                Status = StatusCodes.Status400BadRequest
            });
        }

        protected IActionResult HandleResult<T>(Result<T> result)
        {
            if (result.IsSuccess)
            {
                return Ok(result.Value);
            }

            return BadRequest(new ProblemDetails
            {
                Title = "A business rule was violated",
                Detail = result.Error,
                Status = StatusCodes.Status400BadRequest
            });
        }
    }
}
