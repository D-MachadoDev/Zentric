using MediatR;
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
    public record VariantAttributeDto(string Name, string Value);
    public record CreateProductVariantDto(string Sku, List<VariantAttributeDto> Attributes);

    public record CreateProductCommand(
        string Name,
        string Description,
        decimal PriceAmount,
        string PriceCurrency,
        Guid VendorId,
        ProductType Type,
        List<CreateProductVariantDto>? Variants = null) : IRequest<Result<Guid>>;

    public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, Result<Guid>>
    {
        private readonly IProductRepository _repository;
        private readonly IUnitOfWork _unitOfWork;

        public CreateProductCommandHandler(IProductRepository repository, IUnitOfWork unitOfWork)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<Guid>> Handle(CreateProductCommand request, CancellationToken cancellationToken)
        {
            var variants = request.Variants?.Select(v => 
                (v.Sku, v.Attributes.Select(a => new VariantAttribute(a.Name, a.Value)))
            ).ToList();

            var price = new Money(request.PriceAmount, request.PriceCurrency);

            var product = new Product(
                request.Name,
                request.Description,
                price,
                request.VendorId,
                request.Type,
                variants
            );

            await _repository.AddAsync(product, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(product.Id);
        }
    }
}
