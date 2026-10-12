using System;
using Zentric.Domain.Common.Ports;

namespace Zentric.Infrastructure.Common
{
    /// <summary>
    /// Adaptador de <see cref="IClock"/> para produccion: el reloj del sistema.
    ///
    /// Se registra como singleton porque no tiene estado: delega siempre en
    /// <see cref="DateTimeOffset.UtcNow"/>. Las pruebas usan su propio reloj
    /// controlable y nunca tocan esta clase.
    /// </summary>
    public sealed class SystemClock : IClock
    {
        /// <inheritdoc />
        public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
    }
}
