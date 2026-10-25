using System;

namespace Zentric.Domain.Users.Ports
{
    /// <summary>
    /// Puerto de salida para proteger la credencial del usuario. Define QUE
    /// necesita el Dominio (guardar y comparar una contraseña sin conocerla) sin
    /// afirmar COMO se deriva la clave.
    ///
    /// La elección del algoritmo es una decisión técnica registrada en
    /// ADR-0009: PBKDF2-HMAC-SHA256, 600 000 iteraciones. El Dominio no conoce
    /// el algoritmo porque el adaptador es intercambiable: cambiar a Argon2id
    /// exige otro adaptador, no tocar los casos de uso.
    /// </summary>
    public interface IPasswordHasher
    {
        /// <summary>Deriva el valor que se almacena en <c>User.PasswordHash</c>.</summary>
        /// <param name="password">Contraseña en claro. Solo existe en memoria.</param>
        /// <returns>Cadena autocontenida con algoritmo, coste, sal y subclave.</returns>
        string Hash(string password);

        /// <summary>
        /// Comprueba una contraseña contra un hash almacenado, en tiempo constante.
        /// </summary>
        /// <param name="password">Contraseña en claro recibida.</param>
        /// <param name="storedHash">Valor previamente producido por <see cref="Hash"/>.</param>
        /// <returns><c>true</c> si coinciden. Ante un hash con formato desconocido devuelve <c>false</c>.</returns>
        bool Verify(string password, string storedHash);
    }
}
