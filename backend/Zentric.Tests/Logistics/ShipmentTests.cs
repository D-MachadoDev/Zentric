using Zentric.Domain.Logistics;

namespace Zentric.Tests.Logistics;

/// <summary>
/// El Shipment solo nace desde la orden de entrega (ctor interno): se cubre
/// por sus caminos de negocio, incluidas las guardas de identificadores.
/// </summary>
public sealed class ShipmentTests
{
    [Fact]
    public void AddShipment_DatosValidos_AgregaConIdentificadores()
    {
        var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
        var warehouseId = Guid.NewGuid();

        order.AddShipment(warehouseId, "TRK-1");

        var shipment = Assert.Single(order.Shipments);
        Assert.NotEqual(Guid.Empty, shipment.Id);
        Assert.Equal(order.Id, shipment.FulfillmentOrderId);
        Assert.Equal(warehouseId, shipment.WarehouseId);
        Assert.Equal("TRK-1", shipment.TrackingNumber);
    }

    [Fact]
    public void AddShipment_BodegaVacia_Lanza()
    {
        var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());

        Assert.Throws<ArgumentException>(() => order.AddShipment(Guid.Empty, "TRK-1"));
        Assert.Empty(order.Shipments);
    }

    [Fact]
    public void AddShipment_OrdenCancelada_Lanza()
    {
        var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
        order.CancelDueToNoStock();

        Assert.Throws<InvalidOperationException>(() => order.AddShipment(Guid.NewGuid(), "TRK-1"));
    }

    [Fact]
    public void Dispatch_ConEnvios_PublicaUnEventoPorEnvio()
    {
        var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
        order.AddShipment(Guid.NewGuid(), "TRK-1");
        order.AddShipment(Guid.NewGuid(), "TRK-2");
        order.Pack();

        order.Dispatch();

        Assert.Equal(2, order.DomainEvents.Count);
    }

    [Fact]
    public void CancelDueToNoStock_Despachada_Lanza()
    {
        var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
        order.Pack();
        order.Dispatch();

        Assert.Throws<InvalidOperationException>(() => order.CancelDueToNoStock());
    }

    [Fact]
    public void Deliver_SinDespachar_Lanza()
    {
        var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
        order.Pack();

        Assert.Throws<InvalidOperationException>(() => order.Deliver());
    }
}
