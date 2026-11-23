using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Catalog.Commands;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Products.Ports;

namespace Zentric.Application.Catalog.Queries
{
    public record GetProductReviewsQuery(
        Guid ProductId,
        int Page = 0,
        int Size = 50) : IRequest<Result<IReadOnlyList<ReviewDto>>>;

    public class GetProductReviewsQueryHandler : IRequestHandler<GetProductReviewsQuery, Result<IReadOnlyList<ReviewDto>>>
    {
        private readonly IProductRepository _productRepository;
        private readonly IReviewRepository _reviewRepository;

        public GetProductReviewsQueryHandler(
            IProductRepository productRepository,
            IReviewRepository reviewRepository)
        {
            _productRepository = productRepository;
            _reviewRepository = reviewRepository;
        }

        public async Task<Result<IReadOnlyList<ReviewDto>>> Handle(
            GetProductReviewsQuery request,
            CancellationToken cancellationToken)
        {
            var product = await _productRepository.GetByIdAsync(request.ProductId, cancellationToken);
            if (product is null)
            {
                return Result<IReadOnlyList<ReviewDto>>.NotFound($"Product with ID '{request.ProductId}' was not found.");
            }

            var reviews = await _reviewRepository.GetByProductIdAsync(
                request.ProductId,
                request.Page,
                request.Size,
                cancellationToken);

            var dtos = reviews.Select(r => new ReviewDto(
                r.Id,
                r.ProductId,
                r.UserId,
                r.Rating,
                r.Comment,
                r.CreatedAt,
                r.BuyerName,
                r.ImageUrls)).ToList();

            return Result<IReadOnlyList<ReviewDto>>.Success(dtos);
        }
    }
}
