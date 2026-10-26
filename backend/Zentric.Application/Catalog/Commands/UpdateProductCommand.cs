using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Application.Catalog.Commands
{
    public record UpdateProductCommand(
        Guid ProductId,
        string Name,
        string Description,
        decimal PriceAmount,
        string PriceCurrency,
        Guid CallerId,
        string? ImageUrl = null,
        string? Category = null) : IRequest<Result>;

    public class UpdateProductCommandHandler : IRequestHandler<UpdateProductCommand, Result>
    {
        private readonly IProductRepository _repository;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateProductCommandHandler(IProductRepository repository, IUnitOfWork unitOfWork)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result> Handle(UpdateProductCommand request, CancellationToken cancellationToken)
        {
            var product = await _repository.GetByIdAsync(request.ProductId, cancellationToken);
            if (product is null)
            {
                return Result.NotFound($"Producto con ID {request.ProductId} no encontrado.");
            }

            if (product.VendorId != request.CallerId)
            {
                return Result.Failure("No tiene permisos para modificar un producto que no le pertenece.");
            }

            try
            {
                var price = new Money(request.PriceAmount, request.PriceCurrency);
                product.Update(request.Name, request.Description, price, request.ImageUrl, request.Category);

                await _repository.UpdateAsync(product, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result.Success();
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return Result.Failure(ex.Message);
            }
        }
    }
}
