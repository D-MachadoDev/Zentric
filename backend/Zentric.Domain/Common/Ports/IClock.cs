using System;

namespace Zentric.Domain.Common.Ports
{
    /// <summary>
    /// Puerto de salida para el reloj. Es una abstraccion deliberadamente minima
    /// (un unico instante) en lugar de una interfaz amplia: al dominio solo le
    /// interesa el instante actual, no temporizadores ni zonas horarias.
    ///
    /// Sin este puerto, las marcas de tiempo y la caducidad del carrito
    /// (CustomerOrder.Checkout, 15 minutos) quedaban atadas a
    /// <see cref="DateTime.UtcNow"/> y no podian comprobarse en pruebas sin
    /// esperar en tiempo real. Con este puerto, el comportamiento
    /// dependiente del tiempo se verifica manipulando el reloj inyectado.
    /// </summary>
    public interface IClock
    {
        /// <summary>Instante actual, siempre en UTC.</summary>
        DateTimeOffset UtcNow { get; }
    }
}
