using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;

namespace Zentric.Application.Catalog.Commands
{
    public record TrackProductViewCommand(Guid UserId, Guid ProductId) : IRequest<Result>;

    public class TrackProductViewCommandHandler : IRequestHandler<TrackProductViewCommand, Result>
    {
        private readonly IProductRepository _productRepository;
        private readonly IUserRecentlyViewedRepository _recentlyViewedRepository;

        public TrackProductViewCommandHandler(
            IProductRepository productRepository,
            IUserRecentlyViewedRepository recentlyViewedRepository)
        {
            _productRepository = productRepository;
            _recentlyViewedRepository = recentlyViewedRepository;
        }

        public async Task<Result> Handle(TrackProductViewCommand request, CancellationToken cancellationToken)
        {
            // Verificar que el producto existe y está publicado
            var product = await _productRepository.GetByIdAsync(request.ProductId, cancellationToken);
            if (product is null)
            {
                return Result.NotFound($"Producto {request.ProductId} no encontrado.");
            }

            if (product.Status != ProductStatus.Published)
            {
                return Result.NotFound($"Producto {request.ProductId} no está publicado.");
            }

            // Registrar/actualizar la visualización
            await _recentlyViewedRepository.UpsertAsync(
                request.UserId,
                request.ProductId,
                DateTime.UtcNow,
                cancellationToken);

            return Result.Success();
        }
    }
}