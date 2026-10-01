using System;
using System.Linq;
using Xunit;
using Zentric.Domain.Common.Ports;
using Zentric.Domain.Users.Enums;
using Zentric.Infrastructure.Security;

namespace Zentric.Tests.Security
{
    /// <summary>
    /// Reloj falso para las pruebas: <c>UtcNow</c> es lo que el test diga, no lo
    /// que el sistema diga. Es la pieza que cierra H-06: el comportamiento
    /// dependiente del tiempo se verifica moviendo el reloj, nunca durmiendo.
    /// </summary>
    public sealed class ManualClock : IClock
    {
        public DateTimeOffset UtcNow { get; private set; }

        public ManualClock(DateTimeOffset? start = null)
        {
            UtcNow = start ?? new DateTimeOffset(2026, 9, 29, 12, 0, 0, TimeSpan.Zero);
        }

        /// <summary>Avanza el reloj. Solo hacia adelante: el tiempo no retrocede.</summary>
        public void Advance(TimeSpan amount)
        {
            if (amount < TimeSpan.Zero)
            {
                throw new ArgumentOutOfRangeException(nameof(amount), "The test clock only moves forward.");
            }

            UtcNow = UtcNow.Add(amount);
        }
    }
}