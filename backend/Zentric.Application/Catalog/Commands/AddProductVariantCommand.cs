using Zentric.Application.Common.Messaging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Application.Catalog.Commands
{
    public record AddProductVariantCommand(
        Guid ProductId,
        Guid VendorId,
        string Sku,
        List<VariantAttributeDto> Attributes,
        decimal? PriceAmount = null) : IRequest<Result<Guid>>;

    public class AddProductVariantCommandHandler : IRequestHandler<AddProductVariantCommand, Result<Guid>>
    {
        private readonly IProductRepository _repository;
        private readonly IUnitOfWork _unitOfWork;

        public AddProductVariantCommandHandler(IProductRepository repository, IUnitOfWork unitOfWork)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<Guid>> Handle(AddProductVariantCommand request, CancellationToken cancellationToken)
        {
            var product = await _repository.GetByIdAsync(request.ProductId, cancellationToken);
            if (product == null)
            {
                return Result<Guid>.NotFound("Product not found.");
            }

            if (product.VendorId != request.VendorId)
            {
                return Result<Guid>.NotFound("Product not found.");
            }

            try
            {
                var variant = product.AddVariant(request.Sku, request.Attributes.Select(a => new VariantAttribute(a.Name, a.Value)), request.PriceAmount);
                await _repository.UpdateAsync(product, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                return Result<Guid>.Success(variant.Id);
            }
            catch (ArgumentException ex)
            {
                return Result<Guid>.Failure(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Result<Guid>.Failure(ex.Message);
            }
        }
    }
}
