using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Products.Ports;

namespace Zentric.Application.Catalog.Commands
{
    /// <summary>
    /// Lleva un producto al estado Suspended (Q-25, dictamen del Owner).
    /// El estado Suspended existe en la Ley (ZENTRIC.md Dominio 5) y publish
    /// reactiva desde el, pero no habia camino de entrada. Este comando lo provee.
    /// </summary>
    /// <param name="ProductId">Identificador del producto a suspender.</param>
    public record SuspendProductCommand(Guid ProductId) : IRequest<Result>;

    public class SuspendProductCommandHandler : IRequestHandler<SuspendProductCommand, Result>
    {
        private readonly IProductRepository _repository;
        private readonly IUnitOfWork _unitOfWork;

        public SuspendProductCommandHandler(IProductRepository repository, IUnitOfWork unitOfWork)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result> Handle(SuspendProductCommand request, CancellationToken cancellationToken)
        {
            var product = await _repository.GetByIdAsync(request.ProductId, cancellationToken);
            if (product == null)
            {
                return Result.NotFound("Product not found.");
            }

            try
            {
                product.Suspend();
            }
            // La guarda del agregado (ya suspendido, producto borrado) es regla
            // de negocio predecible: se traduce a Result para responder 400, no 500.
            catch (InvalidOperationException ex)
            {
                return Result.Failure(ex.Message);
            }

            await _repository.UpdateAsync(product, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }
    }
}