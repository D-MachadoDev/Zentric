namespace Zentric.Domain.Billing.Enums
{
    /// <summary>
    /// Clasificación fiscal de los comprobantes emitidos en el modelo de split de facturación.
    /// </summary>
    /// <remarks>
    /// ZENTRIC.md Dominio 9, ADR-0013 y ADR-0014: En un marketplace multi-vendedor, un solo pedido
    /// contiene productos de múltiples comercios. Para cumplir con la normativa tributaria y mantener
    /// el aislamiento fiscal entre vendedores, el sistema divide la liquidación en 3 comprobantes distintos.
    /// </remarks>
    public enum InvoiceType
    {
        /// <summary>
        /// Factura global emitida hacia el Comprador por el monto total consolidado de su compra.
        /// </summary>
        /// <remarks>
        /// El Comprador paga una sola vez y recibe este comprobante único con todos los ítems del carrito.
        /// Su <c>VendorId</c> es nulo porque consolida múltiples tiendas.
        /// </remarks>
        Master = 1,

        /// <summary>
        /// Comprobante fiscal de comisión emitido por la plataforma Zentric hacia el Vendedor.
        /// </summary>
        /// <remarks>
        /// Representa la tarifa por intermediación tecnológica (Platform Fee) que el marketplace deduce
        /// del desembolso al vendedor. No visible para el comprador.
        /// </remarks>
        ZentricDetail = 2,

        /// <summary>
        /// Factura individual emitida por un Vendedor específico por los productos de su catálogo despachados.
        /// </summary>
        /// <remarks>
        /// Garantiza confidencialidad comercial (ADR-0013): cada vendedor solo factura y ve sus propios ítems,
        /// sin tener visibilidad del margen ni los precios de otros vendedores en el mismo pedido.
        /// </remarks>
        VendorDetail = 3
    }
}

