using Zentric.Application.Common.Messaging;
using System;
using Zentric.Application.Common.Models;

namespace Zentric.Application.Logistics.Commands
{
    public record DispatchFulfillmentCommand(Guid FulfillmentOrderId) : IRequest<Result<bool>>;
}
