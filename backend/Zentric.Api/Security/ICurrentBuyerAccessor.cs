using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace Zentric.Api.Security
{
    /// <summary>
    /// Resuelve el comprador que llama a la API.
    ///
    /// Hoy NO hay autenticacion (JWT es el lote 6, bloqueada por el Owner), asi
    /// que el identificador llega en la cabecera `X-Buyer-Id`. Cuando exista
    /// JWT, esta clase pasa a leer el claim y el resto del sistema no cambia:
    /// el unico punto que conoce el mecanismo de identidad es este.
    ///
    /// Referencia: ZENTRIC.md Dominio 2, "el comprador nunca administrara
    /// informacion de otros compradores".
    /// </summary>
    public interface ICurrentBuyerAccessor
    {
        /// <summary>Identificador del comprador, o null si la peticion no lo declara.</summary>
        Guid? BuyerId { get; }
    }

    /// <summary>
    /// Implementacion actual: lee la cabecera `X-Buyer-Id`.
    /// </summary>
    public sealed class HeaderBuyerAccessor : ICurrentBuyerAccessor
    {
        public const string HeaderName = "X-Buyer-Id";

        private readonly IHttpContextAccessor _httpContextAccessor;

        public HeaderBuyerAccessor(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public Guid? BuyerId
        {
            get
            {
                var context = _httpContextAccessor.HttpContext;
                if (context is null) return null;

                // Si ya hay identidad autenticada (futuro JWT), manda el claim.
                var claim = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                            ?? context.User?.FindFirst("sub")?.Value;

                if (Guid.TryParse(claim, out var fromClaim)) return fromClaim;

                var header = context.Request.Headers[HeaderName].ToString();
                return Guid.TryParse(header, out var fromHeader) ? fromHeader : null;
            }
        }
    }
}