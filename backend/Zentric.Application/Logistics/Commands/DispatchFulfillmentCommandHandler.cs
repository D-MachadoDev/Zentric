using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Logistics.Ports;

namespace Zentric.Application.Logistics.Commands
{
    public class DispatchFulfillmentCommandHandler : IRequestHandler<DispatchFulfillmentCommand, Result<bool>>
    {
        private readonly IFulfillmentOrderRepository _fulfillmentOrderRepository;
        private readonly IUnitOfWork _unitOfWork;

        public DispatchFulfillmentCommandHandler(
            IFulfillmentOrderRepository fulfillmentOrderRepository,
            IUnitOfWork unitOfWork)
        {
            _fulfillmentOrderRepository = fulfillmentOrderRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<bool>> Handle(DispatchFulfillmentCommand request, CancellationToken cancellationToken)
        {
            var fulfillmentOrder = await _fulfillmentOrderRepository.GetByIdAsync(request.FulfillmentOrderId, cancellationToken);
            if (fulfillmentOrder == null)
            {
                return Result<bool>.Failure($"FulfillmentOrder with ID {request.FulfillmentOrderId} not found.");
            }

            try
            {
                fulfillmentOrder.Dispatch();
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
