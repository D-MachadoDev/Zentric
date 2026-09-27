using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Products.Ports;

namespace Zentric.Application.Catalog.Commands
{
    public record PublishProductCommand(Guid ProductId) : IRequest<Result>;

    public class PublishProductCommandHandler : IRequestHandler<PublishProductCommand, Result>
    {
        private readonly IProductRepository _repository;
        private readonly IUnitOfWork _unitOfWork;

        public PublishProductCommandHandler(IProductRepository repository, IUnitOfWork unitOfWork)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result> Handle(PublishProductCommand request, CancellationToken cancellationToken)
        {
            var product = await _repository.GetByIdAsync(request.ProductId, cancellationToken);
            if (product == null)
            {
                return Result.Failure("Product not found.");
            }

            product.Publish();

            await _repository.UpdateAsync(product, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }
    }
}
