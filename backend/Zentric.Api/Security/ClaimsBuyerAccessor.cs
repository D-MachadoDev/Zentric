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
    /// Referencia: ZENTRIC.md Dominio 2, "el comprador nunca administrara
    /// informacion de otros compradores", y Dominio 7 (el pedido pertenece a un
    /// unico comprador).
    /// </summary>
    public interface ICurrentBuyerAccessor
    {
        /// <summary>
        /// Identificador del usuario autenticado, o null si la peticion no tiene
        /// identidad (peticiones anonimas como <c>POST /api/auth/login</c>).
        /// </summary>
        Guid? BuyerId { get; }
    }

    /// <summary>
    /// Implementacion sobre <see cref="ClaimsPrincipal"/>. El claim <c>sub</c> es
    /// el identificador de <c>User</c>, y como <c>Buyer.UserId</c> es 1:1 con
    /// <c>User.Id</c>, el mismo valor identifica al comprador.
    /// </summary>
    public sealed class ClaimsBuyerAccessor : ICurrentBuyerAccessor
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ClaimsBuyerAccessor(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public Guid? BuyerId
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
