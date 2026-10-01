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
    /// Confirma la entrega. Ver <see cref="DeliverFulfillmentCommand"/> para quien puede y por que.
    /// </summary>
    public class DeliverFulfillmentCommandHandler : IRequestHandler<DeliverFulfillmentCommand, Result<bool>>
    {
        private readonly IFulfillmentOrderRepository _fulfillmentOrderRepository;
        private readonly IUnitOfWork _unitOfWork;

        public DeliverFulfillmentCommandHandler(
            IFulfillmentOrderRepository fulfillmentOrderRepository,
            IUnitOfWork unitOfWork)
        {
            _fulfillmentOrderRepository = fulfillmentOrderRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<bool>> Handle(DeliverFulfillmentCommand request, CancellationToken cancellationToken)
        {
            // Fail-closed por si el endpoint se expone sin la politica: la politica es la que
            // restringe a Operador, pero el handler no depende solo de ella para una operacion
            // que cierra la operacion comercial. La doble comprobacion es deliberada.
            if (request.CallerRole != UserRole.LogisticsOperator)
            {
                return Result<bool>.Failure("Only the Logistics Operator can confirm a delivery.");
            }

            var fulfillmentOrder = await _fulfillmentOrderRepository.GetByIdAsync(request.FulfillmentOrderId, cancellationToken);
            if (fulfillmentOrder == null)
            {
                return Result<bool>.NotFound($"FulfillmentOrder with ID {request.FulfillmentOrderId} not found.");
            }

            try
            {
                fulfillmentOrder.Deliver();
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