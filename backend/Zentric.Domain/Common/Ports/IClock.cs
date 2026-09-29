using System;

namespace Zentric.Domain.Common.Ports
{
    /// <summary>
    /// Puerto de salida para el reloj. Es una abstraccion deliberadamente minima
    /// (un unico instante) en lugar de una interfaz amplia: al dominio solo le
    /// interesa "que hora es ahora", no temporizadores ni zonas horarias.
    ///
    /// Sin este puerto, las marcas de tiempo y la caducidad del carrito
    /// (CustomerOrder.Checkout, 15 minutos) quedaban atadas a
    /// <see cref="DateTime.UtcNow"/> y no podian comprobarse en pruebas sin
    /// esperar de verdad (hallazgo H-06). Con este puerto, el comportamiento
    /// dependiente del tiempo se verifica moviendo el reloj, no la suite.
    /// </summary>
    public interface IClock
    {
        /// <summary>Instante actual, siempre en UTC.</summary>
        DateTimeOffset UtcNow { get; }
    }
}
