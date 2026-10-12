using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Logistics;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Orders.Services;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Logistics.Commands
{
    public class DispatchFulfillmentCommandHandler : IRequestHandler<DispatchFulfillmentCommand, Result<bool>>
    {
        private readonly IFulfillmentOrderRepository _fulfillmentOrderRepository;
        private readonly ICustomerOrderRepository _customerOrderRepository;
        private readonly OrderFulfillmentProgressSynchronizer _progressSynchronizer;
        private readonly IUnitOfWork _unitOfWork;

        public DispatchFulfillmentCommandHandler(
            IFulfillmentOrderRepository fulfillmentOrderRepository,
            ICustomerOrderRepository customerOrderRepository,
            OrderFulfillmentProgressSynchronizer progressSynchronizer,
            IUnitOfWork unitOfWork)
        {
            _fulfillmentOrderRepository = fulfillmentOrderRepository;
            _customerOrderRepository = customerOrderRepository;
            _progressSynchronizer = progressSynchronizer;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<bool>> Handle(DispatchFulfillmentCommand request, CancellationToken cancellationToken)
        {
            var fulfillmentOrder = await _fulfillmentOrderRepository.GetByIdAsync(request.FulfillmentOrderId, cancellationToken);
            if (fulfillmentOrder == null)
            {
                return Result<bool>.NotFound($"FulfillmentOrder with ID {request.FulfillmentOrderId} not found.");
            }

            // Q-21b: el vendedor no despacha el paquete de otro. El mensaje es el
            // de "no existe" para no confirmar que ese despacho existe.
            if (request.CallerRole == UserRole.Seller && fulfillmentOrder.VendorId != request.CallerId)
            {
                return Result<bool>.NotFound($"FulfillmentOrder with ID {request.FulfillmentOrderId} not found.");
            }

            try
            {
                fulfillmentOrder.Dispatch();
                await _fulfillmentOrderRepository.UpdateAsync(fulfillmentOrder, cancellationToken);
                await SynchronizeMasterOrderAsync(fulfillmentOrder, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result<bool>.Success(true);
            }
            catch (InvalidOperationException ex)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }

        /// <summary>
        /// PED-05: al despachar el ultimo despacho, el pedido maestro pasa a Dispatched.
        /// Se hace en la misma transaccion para que el comprador no lea un estado rancio.
        /// </summary>
        private async Task SynchronizeMasterOrderAsync(FulfillmentOrder changed, CancellationToken cancellationToken)
        {
            var masterOrder = await _customerOrderRepository.GetByIdAsync(changed.CustomerOrderId, cancellationToken);
            if (masterOrder == null)
            {
                return;
            }

            var statusBeforeSync = masterOrder.Status;

            var siblings = await _fulfillmentOrderRepository.GetByCustomerOrderIdAsync(
                changed.CustomerOrderId, cancellationToken);

            // El despacho recien cambiado no esta persistido todavia: la consulta devuelve
            // su estado anterior, asi que se usa el de memoria en su lugar.
            var statuses = siblings
                .Where(f => f.Id != changed.Id)
                .Select(f => f.Status)
                .Append(changed.Status)
                .ToList();

            _progressSynchronizer.Synchronize(masterOrder, statuses);

            if (masterOrder.Status != statusBeforeSync)
            {
                await _customerOrderRepository.UpdateAsync(masterOrder, cancellationToken);
            }
        }
    }
}
