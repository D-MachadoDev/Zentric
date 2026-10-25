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
    /// <summary>
    /// Confirma la entrega. Ver <see cref="DeliverFulfillmentCommand"/> para quien puede y por que.
    /// </summary>
    public class DeliverFulfillmentCommandHandler : IRequestHandler<DeliverFulfillmentCommand, Result<bool>>
    {
        private readonly IFulfillmentOrderRepository _fulfillmentOrderRepository;
        private readonly ICustomerOrderRepository _customerOrderRepository;
        private readonly OrderFulfillmentProgressSynchronizer _progressSynchronizer;
        private readonly IUnitOfWork _unitOfWork;

        public DeliverFulfillmentCommandHandler(
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
        /// El pedido maestro refleja el minimo comun de sus despachos, asi que
        /// avanza cuando el ultimo de ellos llega al estado. Se sincroniza en la MISMA
        /// transaccion que el cambio del despacho: hacerlo despues dejaria al comprador
        /// leyendo un pedido que aun no refleja lo que acaba de ocurrir.
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

            // El despacho recien cambiado todavia no esta persistido, de modo que la
            // consulta devuelve su estado ANTERIOR. Se excluye de la lista y se anade el
            // que tiene en memoria; sin esto el pedido no avanzaria hasta la siguiente
            // transicion de ese despacho.
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