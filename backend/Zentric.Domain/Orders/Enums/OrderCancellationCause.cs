namespace Zentric.Domain.Orders.Enums
{
    /// <summary>
    /// Por que quedo cancelado un pedido. ADR-0022 (decision 2) exige que un
    /// pedido liquidado y uno caducado "no puedan leerse igual": con un string
    /// libre ambos se leen igual, asi que la causa es un tipo y el detalle es
    /// texto opcional que no la sustituye.
    /// </summary>
    /// El tipo se llama <c>OrderCancellationCause</c> y no <c>CancellationCause</c>
    /// porque <c>CustomerOrder.CancellationCause</c> es la PROPIEDAD que lo guarda:
    /// si compartieran nombre, la propiedad taparia al tipo dentro de la clase.
    public enum OrderCancellationCause
    {
        /// <summary>Vencimiento de la ventana de pago (PED-01).</summary>
        PaymentTimeout = 0,

        /// <summary>
        /// Resolucion total: todos los despachos cancelados por quiebre de stock
        /// (EXC-01) y el comprobante con credito acumulado igual a lo cobrado
        /// (invariante 14). No llego nada y el dinero volvio entero.
        /// </summary>
        FullyResolved = 1,
    }
}