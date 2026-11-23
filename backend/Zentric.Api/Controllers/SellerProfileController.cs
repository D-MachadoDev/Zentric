using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Zentric.Api.Contracts;
using Zentric.Api.Security;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Ports;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Gestión de la tienda, marca, logotipo y perfil comercial del vendedor autenticado.
    /// </summary>
    [ApiController]
    [Route("api/seller/profile")]
    [Tags("Seller Profile")]
    [Produces("application/json")]
    public class SellerProfileController : ControllerBase
    {
        private readonly ISellerProfileRepository _sellerProfileRepository;
        private readonly IUserRepository _userRepository;
        private readonly ICurrentUserAccessor _currentUser;

        public SellerProfileController(
            ISellerProfileRepository sellerProfileRepository,
            IUserRepository userRepository,
            ICurrentUserAccessor currentUser)
        {
            _sellerProfileRepository = sellerProfileRepository ?? throw new ArgumentNullException(nameof(sellerProfileRepository));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _currentUser = currentUser ?? throw new ArgumentNullException(nameof(currentUser));
        }

        /// <summary>
        /// Obtiene el perfil comercial de la tienda del vendedor autenticado.
        /// Si no existe un registro previo, se crea uno automáticamente derivado del nombre del usuario.
        /// </summary>
        /// <response code="200">Perfil comercial de la tienda.</response>
        /// <response code="401">No autenticado o token inválido.</response>
        /// <response code="403">No autorizado: requiere rol Vendedor.</response>
        [HttpGet]
        [Authorize(Policy = AuthorizationPolicies.ProductManagement)]
        [ProducesResponseType(typeof(SellerProfileDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
        {
            var userId = _currentUser.UserId;
            if (userId is null)
            {
                return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });
            }

            var profile = await _sellerProfileRepository.GetByUserIdAsync(userId.Value, cancellationToken);
            if (profile is null)
            {
                var user = await _userRepository.GetByIdAsync(userId.Value);
                var defaultStoreName = user != null && !string.IsNullOrWhiteSpace(user.FullName.ToString())
                    ? $"Tienda de {user.FullName}"
                    : "Mi Tienda Oficial";

                if (defaultStoreName.Length > 150)
                {
                    defaultStoreName = defaultStoreName[..150];
                }

                profile = new SellerProfile(userId.Value, defaultStoreName, null, isVerified: false);
                await _sellerProfileRepository.AddAsync(profile, cancellationToken);
            }

            return Ok(new SellerProfileDto(
                profile.Id,
                profile.UserId,
                profile.StoreName,
                profile.LogoUrl,
                profile.IsVerified,
                profile.CreatedAt,
                profile.UpdatedAt));
        }

        /// <summary>
        /// Actualiza los datos de la tienda comercial (nombre público de tienda y logotipo de marca).
        /// </summary>
        /// <param name="request">Datos actualizados de la tienda.</param>
        /// <param name="cancellationToken">Token de cancelación.</param>
        /// <response code="200">Perfil comercial actualizado exitosamente.</response>
        /// <response code="400">Datos inválidos (nombre de tienda vacío o excede 150 caracteres).</response>
        /// <response code="401">No autenticado o token inválido.</response>
        /// <response code="403">No autorizado: requiere rol Vendedor.</response>
        [HttpPut]
        [Authorize(Policy = AuthorizationPolicies.ProductManagement)]
        [ProducesResponseType(typeof(SellerProfileDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateSellerProfileRequest request, CancellationToken cancellationToken)
        {
            var userId = _currentUser.UserId;
            if (userId is null)
            {
                return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });
            }

            if (string.IsNullOrWhiteSpace(request.StoreName))
            {
                return BadRequest(new ProblemDetails { Detail = "El nombre de la tienda es obligatorio." });
            }

            if (request.StoreName.Trim().Length > 150)
            {
                return BadRequest(new ProblemDetails { Detail = "El nombre de la tienda no puede exceder 150 caracteres." });
            }

            var profile = await _sellerProfileRepository.GetByUserIdAsync(userId.Value, cancellationToken);
            if (profile is null)
            {
                profile = new SellerProfile(userId.Value, request.StoreName.Trim(), request.LogoUrl, isVerified: false);
                await _sellerProfileRepository.AddAsync(profile, cancellationToken);
            }
            else
            {
                profile.UpdateProfile(request.StoreName, request.LogoUrl);
                await _sellerProfileRepository.UpdateAsync(profile, cancellationToken);
            }

            return Ok(new SellerProfileDto(
                profile.Id,
                profile.UserId,
                profile.StoreName,
                profile.LogoUrl,
                profile.IsVerified,
                profile.CreatedAt,
                profile.UpdatedAt));
        }
    }
}
