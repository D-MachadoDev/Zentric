using Zentric.Application.Common.Messaging;
using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Logistics.Commands
{
    /// <summary>
    /// Empaqueta un despacho. Ver <see cref="PackFulfillmentCommand"/> para el porqué de existir.
    /// </summary>
    public class PackFulfillmentCommandHandler : IRequestHandler<PackFulfillmentCommand, Result<bool>>
    {
        private readonly IFulfillmentOrderRepository _fulfillmentOrderRepository;
        private readonly IUnitOfWork _unitOfWork;

        public PackFulfillmentCommandHandler(
            IFulfillmentOrderRepository fulfillmentOrderRepository,
            IUnitOfWork unitOfWork)
        {
            _fulfillmentOrderRepository = fulfillmentOrderRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<bool>> Handle(PackFulfillmentCommand request, CancellationToken cancellationToken)
        {
            var fulfillmentOrder = await _fulfillmentOrderRepository.GetByIdAsync(request.FulfillmentOrderId, cancellationToken);
            if (fulfillmentOrder == null)
            {
                return Result<bool>.NotFound($"FulfillmentOrder with ID {request.FulfillmentOrderId} not found.");
            }

            // Q-21b: el vendedor no empaqueta el paquete de otro. El mensaje es el de "no
            // existe" para no confirmar que ese despacho existe.
            if (request.CallerRole == UserRole.Seller && fulfillmentOrder.VendorId != request.CallerId)
            {
                return Result<bool>.NotFound($"FulfillmentOrder with ID {request.FulfillmentOrderId} not found.");
            }

            try
            {
                fulfillmentOrder.Pack();
                await _fulfillmentOrderRepository.UpdateAsync(fulfillmentOrder, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result<bool>.Success(true);
            }
            catch (InvalidOperationException ex)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }
    }
}