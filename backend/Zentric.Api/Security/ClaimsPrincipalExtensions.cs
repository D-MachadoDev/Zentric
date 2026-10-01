using System;
using System.Security.Claims;
using Zentric.Domain.Users.Enums;

namespace Zentric.Api.Security
{
    /// <summary>
    /// Lectura del rol desde el principal ya autenticado.
    ///
    /// El rol viaja como claim con la URI larga de <see cref="ClaimTypes.Role"/>
    /// (lo emite <c>JwtAuthTokenService</c> y lo valida el middleware). El parseo
    /// vive aqui para que ningun controlador escriba literales de rol ni parseos
    /// sueltos: Q-21b necesita conocer el rol del llamante para aplicar la
    /// propiedad del recurso (Comprador y Vendedor ven lo suyo; Operador,
    /// Administrador y Supervisor leen sin filtro de dueno).
    /// </summary>
    public static class ClaimsPrincipalExtensions
    {
        /// <summary>
        /// Rol del llamante, o null si el claim no existe o no es un valor de
        /// <see cref="UserRole"/>. Null es un caso imposible con la matriz
        /// vigente (la politica ya exigio rol) y debe responderse fail-closed.
        /// </summary>
        public static UserRole? GetUserRole(this ClaimsPrincipal principal)
        {
            var value = principal.FindFirst(ClaimTypes.Role)?.Value;
            return Enum.TryParse<UserRole>(value, out var role) ? role : null;
        }
    }
}
