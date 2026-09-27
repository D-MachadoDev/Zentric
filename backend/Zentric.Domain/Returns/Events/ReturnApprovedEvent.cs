using Zentric.Domain.Common.Models;

namespace Zentric.Domain.Returns.Events
{
    public sealed record ReturnApprovedEvent(Guid ReturnRequestId, Guid VariantId, Guid WarehouseId, int Quantity) : IDomainEvent;
}
