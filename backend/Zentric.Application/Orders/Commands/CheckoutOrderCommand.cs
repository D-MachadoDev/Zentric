using MediatR;
using System;
using Zentric.Application.Common.Models;

namespace Zentric.Application.Orders.Commands
{
    public record CheckoutOrderCommand(Guid OrderId) : IRequest<Result<bool>>;
}
