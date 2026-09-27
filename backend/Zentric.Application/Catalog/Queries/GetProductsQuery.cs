using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Domain.Products.Ports;

namespace Zentric.Application.Catalog.Queries
{
    public record ProductVariantDto(Guid Id, string Sku, bool CanBeSold);

    public record ProductDto(
        Guid Id,
        string Name,
        string Description,
        decimal Price,
        string Currency,
        Guid VendorId,
        string Type,
        string Status,
        IReadOnlyList<ProductVariantDto> Variants,
        DateTime CreatedAt);

    public record GetProductsQuery(Guid? VendorId = null) : IRequest<Result<IReadOnlyList<ProductDto>>>;

    public class GetProductsQueryHandler : IRequestHandler<GetProductsQuery, Result<IReadOnlyList<ProductDto>>>
    {
        private readonly IProductRepository _productRepository;

        public GetProductsQueryHandler(IProductRepository productRepository)
        {
            _productRepository = productRepository;
        }

        public async Task<Result<IReadOnlyList<ProductDto>>> Handle(GetProductsQuery request, CancellationToken cancellationToken)
        {
            var list = await _productRepository.GetAllAsync(request.VendorId, cancellationToken);
            var dtos = list.Select(p => new ProductDto(
                p.Id,
                p.Name,
                p.Description,
                p.Price.Amount,
                p.Price.Currency,
                p.VendorId,
                p.Type.ToString(),
                p.Status.ToString(),
                p.Variants.Select(v => new ProductVariantDto(v.Id, v.Sku, v.CanBeSold)).ToList(),
                p.CreatedAt
            )).ToList();

            return Result<IReadOnlyList<ProductDto>>.Success(dtos);
        }
    }

    public record GetProductByIdQuery(Guid Id) : IRequest<Result<ProductDto>>;

    public class GetProductByIdQueryHandler : IRequestHandler<GetProductByIdQuery, Result<ProductDto>>
    {
        private readonly IProductRepository _productRepository;

        public GetProductByIdQueryHandler(IProductRepository productRepository)
        {
            _productRepository = productRepository;
        }

        public async Task<Result<ProductDto>> Handle(GetProductByIdQuery request, CancellationToken cancellationToken)
        {
            var p = await _productRepository.GetByIdAsync(request.Id, cancellationToken);
            if (p == null)
            {
                return Result<ProductDto>.Failure("Product not found.");
            }

            var dto = new ProductDto(
                p.Id,
                p.Name,
                p.Description,
                p.Price.Amount,
                p.Price.Currency,
                p.VendorId,
                p.Type.ToString(),
                p.Status.ToString(),
                p.Variants.Select(v => new ProductVariantDto(v.Id, v.Sku, v.CanBeSold)).ToList(),
                p.CreatedAt
            );

            return Result<ProductDto>.Success(dto);
        }
    }
}
