using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Entities;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Orders;

/// <summary>
/// Ramas del pedido sin cubrir: fusion de lineas, retiro, entrega digital
/// (CAT-02) y resolucion total (ADR-0022).
/// </summary>
public sealed class CustomerOrderBranchesTests
{
    private static Money Price() => new(10000m, "COP");

    private static CustomerOrder CartWithItem(int quantity = 2)
    {
        var order = new CustomerOrder(Guid.NewGuid());
        order.AddItem(Guid.NewGuid(), Guid.NewGuid(), quantity, Price());
        return order;
    }

    private static CustomerOrder PaidOrder()
    {
        var order = CartWithItem();
        order.Checkout();
        order.MarkAsPaid();
        return order;
    }

    private static CustomerOrder DeliveredOrder()
    {
        var order = PaidOrder();
        order.Dispatch();
        order.Deliver();
        return order;
    }

    [Fact]
    public void AddItem_MismaVariante_AcumulaCantidad()
    {
        var order = new CustomerOrder(Guid.NewGuid());
        var variantId = Guid.NewGuid();

        order.AddItem(variantId, Guid.NewGuid(), 2, Price());
        order.AddItem(variantId, Guid.NewGuid(), 3, Price());

        var item = Assert.Single(order.Items);
        Assert.Equal(5, item.Quantity);
        Assert.Equal(new Money(50000m, "COP"), item.TotalPrice);
    }

    [Fact]
    public void AddItem_CantidadCeroEnLineaExistente_Lanza()
    {
        var order = new CustomerOrder(Guid.NewGuid());
        var variantId = Guid.NewGuid();
        order.AddItem(variantId, Guid.NewGuid(), 2, Price());

        Assert.Throws<ArgumentOutOfRangeException>(() => order.AddItem(variantId, Guid.NewGuid(), 0, Price()));
    }

    [Fact]
    public void AddItem_CantidadCeroNueva_Lanza()
    {
        var order = new CustomerOrder(Guid.NewGuid());

        Assert.Throws<ArgumentOutOfRangeException>(
            () => order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 0, Price()));
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public void AddItem_GuidVacio_Lanza(bool emptyVariant, bool emptyVendor)
    {
        var order = new CustomerOrder(Guid.NewGuid());

        Assert.Throws<ArgumentException>(() => order.AddItem(
            emptyVariant ? Guid.Empty : Guid.NewGuid(),
            emptyVendor ? Guid.Empty : Guid.NewGuid(),
            1, Price()));
    }

    [Fact]
    public void AddItem_PrecioNulo_Lanza()
    {
        var order = new CustomerOrder(Guid.NewGuid());

        Assert.Throws<ArgumentNullException>(
            () => order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, null!));
    }

    [Fact]
    public void RemoveItem_Existente_LoRetira()
    {
        var order = new CustomerOrder(Guid.NewGuid());
        var doomed = Guid.NewGuid();
        order.AddItem(doomed, Guid.NewGuid(), 1, Price());
        order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, Price());

        order.RemoveItem(doomed);

        var item = Assert.Single(order.Items);
        Assert.NotEqual(doomed, item.VariantId);
    }

    [Fact]
    public void RemoveItem_Inexistente_Lanza()
    {
        var order = CartWithItem();

        Assert.Throws<InvalidOperationException>(() => order.RemoveItem(Guid.NewGuid()));
    }

    [Fact]
    public void RemoveItem_FueraDeCarrito_Lanza()
    {
        var order = CartWithItem();
        var variantId = order.Items.Single().VariantId;
        order.Checkout();

        Assert.Throws<InvalidOperationException>(() => order.RemoveItem(variantId));
    }

    [Fact]
    public void RemoveItem_Entregado_Lanza()
    {
        var order = DeliveredOrder();

        Assert.Throws<InvalidOperationException>(() => order.RemoveItem(Guid.NewGuid()));
    }

    [Fact]
    public void Checkout_CarritoVacio_Lanza()
    {
        var order = new CustomerOrder(Guid.NewGuid());

        Assert.Throws<InvalidOperationException>(() => order.Checkout());
    }

    [Fact]
    public void Checkout_DosVeces_Lanza()
    {
        var order = CartWithItem();
        order.Checkout();

        Assert.Throws<InvalidOperationException>(() => order.Checkout());
    }

    [Fact]
    public void MarkAsPaid_DesdeCarrito_Lanza()
    {
        var order = CartWithItem();

        Assert.Throws<InvalidOperationException>(() => order.MarkAsPaid());
    }

    [Fact]
    public void Dispatch_DesdeCarrito_Lanza()
    {
        var order = CartWithItem();

        Assert.Throws<InvalidOperationException>(() => order.Dispatch());
    }

    [Fact]
    public void AddDigitalDelivery_Nula_Lanza()
    {
        var order = PaidOrder();

        Assert.Throws<ArgumentNullException>(() => order.AddDigitalDelivery(null!));
    }

    [Fact]
    public void AddDigitalDelivery_SinPagar_Lanza()
    {
        var order = CartWithItem();
        var record = new DigitalDeliveryRecord(
            order.Id, Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "Ebook", "EBOOK-1");

        Assert.Throws<InvalidOperationException>(() => order.AddDigitalDelivery(record));
    }

    [Fact]
    public void AddDigitalDelivery_Pagado_RegistraEntrega()
    {
        var order = PaidOrder();
        var record = new DigitalDeliveryRecord(
            order.Id, Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "Ebook", "EBOOK-1");

        order.AddDigitalDelivery(record);

        Assert.Same(record, Assert.Single(order.DigitalDeliveries));
    }

    [Fact]
    public void ResolveFully_Resuelto_Idempotente()
    {
        var order = CartWithItem();

        order.ResolveFully(areAllFulfillmentsCancelled: true, isReceiptFullyRefunded: true);

        Assert.Equal(OrderStatus.Cancelled, order.Status);
        Assert.Equal(OrderCancellationCause.FullyResolved, order.CancellationCause);
        Assert.NotNull(order.CancellationReason);
    }

    /// <summary>
    /// HALLAZGO pendiente de dictamen (no se toca produccion): el comentario
    /// de ResolveFully promete idempotencia ("ejecutarse muchas veces sin
    /// fallar"), pero EnsureNotDelivered() corre ANTES de la guarda
    /// idempotente y rechaza todo pedido Cancelled, asi que la segunda llamada
    /// explota y el `return` es inalcanzable. El test documenta el
    /// comportamiento real; reordenar la guarda cambia comportamiento y
    /// requiere dictamen del Owner.
    /// </summary>
    [Fact]
    public void ResolveFully_SegundaVez_LanzaPorGuardaGlobal()
    {
        var order = CartWithItem();
        order.ResolveFully(areAllFulfillmentsCancelled: true, isReceiptFullyRefunded: true);

        Assert.Throws<InvalidOperationException>(() =>
            order.ResolveFully(areAllFulfillmentsCancelled: true, isReceiptFullyRefunded: true));
    }

    [Fact]
    public void ResolveFully_SinDespachosCancelados_Lanza()
    {
        var order = CartWithItem();

        Assert.Throws<InvalidOperationException>(() =>
            order.ResolveFully(areAllFulfillmentsCancelled: false, isReceiptFullyRefunded: true));
    }

    [Fact]
    public void ResolveFully_SinReembolsoTotal_Lanza()
    {
        var order = CartWithItem();

        Assert.Throws<InvalidOperationException>(() =>
            order.ResolveFully(areAllFulfillmentsCancelled: true, isReceiptFullyRefunded: false));
    }

    [Fact]
    public void ResolveFully_Entregado_Lanza()
    {
        var order = DeliveredOrder();

        Assert.Throws<InvalidOperationException>(() =>
            order.ResolveFully(areAllFulfillmentsCancelled: true, isReceiptFullyRefunded: true));
    }
}
