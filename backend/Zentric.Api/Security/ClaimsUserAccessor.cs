using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace Zentric.Api.Security
{
    /// <summary>
    /// Resuelve la identidad del llamante a partir del token verificado.
    ///
    /// ANTES: <c>HeaderBuyerAccessor</c> leia el identificador de la cabecera
    /// `X-Buyer-Id`, que el cliente escribe libremente. Cualquiera que enviara un
    /// GUID obtenia la identidad de ese comprador, con lo que RG-01 ("toda
    /// operacion debe ejecutarse por un usuario autenticado") no se cumplia.
    /// ADR-0009 elimina esa cabecera.
    ///
    /// La identidad se toma UNICAMENTE de los claims de un token ya validado por
    /// el middleware. No hay ninguna via alternativa: si el token falta o es
    /// invalido, la peticion no llega al controlador porque responde 401 antes.
    ///
    /// Q-21b (dictada por el Owner el 2026-09-29): la propiedad del recurso se
    /// comprueba contra este identificador en las tres fronteras (lecturas,
    /// listados y escrituras). Para el Comprador su valor ES el BuyerId del
    /// pedido (ZENTRIC.md Dominio 2: "el comprador nunca administrara informacion
    /// de otros compradores") y para el Vendedor ES su VendorId, por la
    /// convencion ratificada en Q-21b (el id del vendedor es su User.Id, espejo
    /// del 1:1 Buyer.UserId). Por eso el nombre generico: "Buyer" se quedaba
    /// corto cuando el mismo valor identifica a cualquier rol.
    /// </summary>
    public interface ICurrentUserAccessor
    {
        /// <summary>
        /// Identificador del usuario autenticado, o null si la peticion no tiene
        /// identidad (peticiones anonimas como <c>POST /api/auth/login</c>).
        /// </summary>
        Guid? UserId { get; }
    }

    /// <summary>
    /// Implementacion sobre <see cref="ClaimsPrincipal"/>. El claim <c>sub</c> es
    /// el identificador de <c>User</c>; como <c>Buyer.UserId</c> y el VendorId
    /// convenido (Q-21b) son 1:1 con <c>User.Id</c>, el mismo valor identifica
    /// al usuario en todos los roles.
    /// </summary>
    public sealed class ClaimsUserAccessor : ICurrentUserAccessor
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ClaimsUserAccessor(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public Guid? UserId
        {
            get
            {
                var principal = _httpContextAccessor.HttpContext?.User;
                if (principal?.Identity?.IsAuthenticated != true)
                {
                    return null;
                }

                // Se acepta cualquiera de los dos nombres porque, segun como se
                // configure la validacion, el claim aparece como "sub" o ya
                // traducido como NameIdentifier.
                string? value = principal.FindFirst("sub")?.Value
                                ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                return Guid.TryParse(value, out var id) ? id : null;
            }
        }
    }
}
