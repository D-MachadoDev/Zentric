using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Ports;

namespace Zentric.Application.Catalog.Commands
{
    public record ReviewDto(
        Guid Id,
        Guid ProductId,
        Guid UserId,
        int Rating,
        string? Comment,
        DateTime CreatedAt,
        string? BuyerName = null,
        IReadOnlyList<string>? ImageUrls = null);

    public record CreateProductReviewCommand(
        Guid ProductId,
        Guid UserId,
        int Rating,
        string? Comment,
        string? BuyerName = null,
        IReadOnlyList<string>? ImageUrls = null) : IRequest<Result<ReviewDto>>;

    public class CreateProductReviewCommandHandler : IRequestHandler<CreateProductReviewCommand, Result<ReviewDto>>
    {
        private readonly IProductRepository _productRepository;
        private readonly IReviewRepository _reviewRepository;
        private readonly IUnitOfWork _unitOfWork;

        public CreateProductReviewCommandHandler(
            IProductRepository productRepository,
            IReviewRepository reviewRepository,
            IUnitOfWork unitOfWork)
        {
            _productRepository = productRepository ?? throw new ArgumentNullException(nameof(productRepository));
            _reviewRepository = reviewRepository ?? throw new ArgumentNullException(nameof(reviewRepository));
            _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
        }

        public async Task<Result<ReviewDto>> Handle(CreateProductReviewCommand request, CancellationToken cancellationToken)
        {
            var product = await _productRepository.GetByIdAsync(request.ProductId, cancellationToken);
            if (product is null)
            {
                return Result<ReviewDto>.NotFound($"Product with ID '{request.ProductId}' was not found.");
            }

            var existingReview = await _reviewRepository.GetByProductAndUserAsync(request.ProductId, request.UserId, cancellationToken);

            if (existingReview is not null)
            {
                var oldRating = existingReview.Rating;
                existingReview.Update(request.Rating, request.Comment, request.BuyerName, request.ImageUrls);
                product.ApplyReview(request.Rating, oldRating);

                await _reviewRepository.UpdateAsync(existingReview, cancellationToken);
                await _productRepository.UpdateAsync(product, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result<ReviewDto>.Success(new ReviewDto(
                    existingReview.Id,
                    existingReview.ProductId,
                    existingReview.UserId,
                    existingReview.Rating,
                    existingReview.Comment,
                    existingReview.CreatedAt,
                    existingReview.BuyerName,
                    existingReview.ImageUrls));
            }

            var newReview = new Review(
                request.ProductId,
                request.UserId,
                request.Rating,
                request.Comment,
                request.BuyerName,
                request.ImageUrls);
            product.ApplyReview(request.Rating);

            await _reviewRepository.AddAsync(newReview, cancellationToken);
            await _productRepository.UpdateAsync(product, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<ReviewDto>.Success(new ReviewDto(
                newReview.Id,
                newReview.ProductId,
                newReview.UserId,
                newReview.Rating,
                newReview.Comment,
                newReview.CreatedAt,
                newReview.BuyerName,
                newReview.ImageUrls));
        }
    }
}
