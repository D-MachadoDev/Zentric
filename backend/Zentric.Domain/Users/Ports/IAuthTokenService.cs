using System;
using Zentric.Domain.Users.Enums;

namespace Zentric.Domain.Users.Ports
{
    /// <summary>
    /// Puerto de salida para emitir la credencial de sesión. Define QUE necesita
    /// el sistema (representar a un usuario autenticado) sin afirmar COMO se
    /// firma ni se transporta.
    ///
    /// ADR-0009 fija JWT con HS256, pero el Dominio no depende de ese formato:
    /// el caso de uso solo pide "el token de este usuario".
    /// </summary>
    public interface IAuthTokenService
    {
        /// <summary>Emite la credencial de sesión para un usuario.</summary>
        /// <param name="userId">Identidad que viajará en el claim <c>sub</c>.</param>
        /// <param name="email">Correo, para trazabilidad.</param>
        /// <param name="fullName">Nombre completo, para presentación.</param>
        /// <param name="role">Rol único del usuario (RG-02).</param>
        AuthToken Issue(Guid userId, string email, string fullName, UserRole role);
    }

    /// <summary>
    /// Credencial emitida. El valor es opaco para las capas superiores: solo
    /// el adaptador sabe interpretarlo.
    /// </summary>
    public sealed record AuthToken(string Value, DateTimeOffset ExpiresAt);
}
