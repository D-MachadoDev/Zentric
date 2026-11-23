using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Catalog.Commands;
using Zentric.Application.Catalog.Validators;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Application.Catalog
{
    public class FakeReviewRepository : IReviewRepository
    {
        public List<Review> Reviews { get; } = new();

        public Task<Review?> GetByProductAndUserAsync(Guid productId, Guid userId, CancellationToken cancellationToken = default)
            => Task.FromResult(Reviews.FirstOrDefault(r => r.ProductId == productId && r.UserId == userId));

        public Task<IReadOnlyList<Review>> GetByProductIdAsync(Guid productId, int page = 0, int size = 20, CancellationToken cancellationToken = default)
        {
            var list = Reviews.Where(r => r.ProductId == productId).Skip(page * size).Take(size).ToList();
            return Task.FromResult<IReadOnlyList<Review>>(list);
        }

        public Task<int> GetCountByProductIdAsync(Guid productId, CancellationToken cancellationToken = default)
            => Task.FromResult(Reviews.Count(r => r.ProductId == productId));

        public Task AddAsync(Review review, CancellationToken cancellationToken = default)
        {
            Reviews.Add(review);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(Review review, CancellationToken cancellationToken = default)
        {
            var index = Reviews.FindIndex(r => r.Id == review.Id);
            if (index >= 0) Reviews[index] = review;
            return Task.CompletedTask;
        }
    }

    public class FakeUnitOfWorkForReview : IUnitOfWork
    {
        public int SaveChangesCalls { get; private set; }

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveChangesCalls++;
            return Task.FromResult(1);
        }
    }

    public class CreateProductReviewCommandHandlerTests
    {
        /// <summary>
        /// Objetivo: Validar que si el producto no existe en el catálogo, el handler retorne falla 404 NotFound.
        /// </summary>
        [Fact(DisplayName = "1. Handle con producto inexistente retorna resultado fallido NotFound")]
        public async Task Handle_ProductNotFound_ReturnsFailure()
        {
            var productRepo = new FakeProductRepository();
            var reviewRepo = new FakeReviewRepository();
            var unitOfWork = new FakeUnitOfWorkForReview();
            var handler = new CreateProductReviewCommandHandler(productRepo, reviewRepo, unitOfWork);

            var command = new CreateProductReviewCommand(Guid.NewGuid(), Guid.NewGuid(), 5, "Buen producto");
            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("not found", result.Error, StringComparison.OrdinalIgnoreCase);
            Assert.Equal(0, unitOfWork.SaveChangesCalls);
        }

        /// <summary>
        /// Objetivo: Validar que una nueva reseña actualice de forma atómica el promedio, conteo del producto e invoque SaveChangesAsync.
        /// </summary>
        [Fact(DisplayName = "2. Handle con reseña nueva crea la reseña, actualiza métricas del producto y persiste mediante IUnitOfWork")]
        public async Task Handle_NewReview_CreatesReviewAndAtomicallyUpdatesProductRating()
        {
            var productRepo = new FakeProductRepository();
            var reviewRepo = new FakeReviewRepository();
            var unitOfWork = new FakeUnitOfWorkForReview();
            var product = new Product("Laptop Pro", "Gamer 32GB RAM", new Money(3500000m, "COP"), Guid.NewGuid(), ProductType.Digital);
            await productRepo.AddAsync(product);

            var handler = new CreateProductReviewCommandHandler(productRepo, reviewRepo, unitOfWork);
            var userId = Guid.NewGuid();
            var command = new CreateProductReviewCommand(product.Id, userId, 5, "Excelente equipo", "Carlos Comprador");

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(5, result.Value.Rating);
            Assert.Equal("Excelente equipo", result.Value.Comment);
            Assert.Equal("Carlos Comprador", result.Value.BuyerName);
            Assert.Single(reviewRepo.Reviews);

            // Verificación de recálculo atómico en el producto y persistencia en UnitOfWork
            Assert.Equal(5.00m, product.AverageRating);
            Assert.Equal(1, product.ReviewsCount);
            Assert.True(unitOfWork.SaveChangesCalls > 0);
        }

        /// <summary>
        /// Objetivo: Validar que la edición de una reseña previa recalcule el promedio con base en la diferencia y persista en PostgreSQL.
        /// </summary>
        [Fact(DisplayName = "3. Handle con reseña existente actualiza el comentario y recalcula el promedio del producto")]
        public async Task Handle_ExistingReview_UpdatesReviewAndRecalculatesProductRating()
        {
            var productRepo = new FakeProductRepository();
            var reviewRepo = new FakeReviewRepository();
            var unitOfWork = new FakeUnitOfWorkForReview();
            var product = new Product("Laptop Pro", "Gamer 32GB RAM", new Money(3500000m, "COP"), Guid.NewGuid(), ProductType.Digital);
            await productRepo.AddAsync(product);

            var handler = new CreateProductReviewCommandHandler(productRepo, reviewRepo, unitOfWork);
            var userId = Guid.NewGuid();

            // Primera reseña: 3 estrellas
            await handler.Handle(new CreateProductReviewCommand(product.Id, userId, 3, "Regular"), CancellationToken.None);
            Assert.Equal(3.00m, product.AverageRating);
            Assert.Equal(1, product.ReviewsCount);
            Assert.Equal(1, unitOfWork.SaveChangesCalls);

            // Usuario actualiza a 5 estrellas
            var result = await handler.Handle(new CreateProductReviewCommand(product.Id, userId, 5, "Excelente ahora"), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(5, result.Value.Rating);
            Assert.Single(reviewRepo.Reviews); // La cantidad en BD sigue siendo 1 reseña

            // Recálculo del rating del producto y segunda llamada a SaveChangesAsync
            Assert.Equal(5.00m, product.AverageRating);
            Assert.Equal(1, product.ReviewsCount);
            Assert.Equal(2, unitOfWork.SaveChangesCalls);
        }

        /// <summary>
        /// Objetivo: Validar que el validador acepte comandos con puntuaciones de 1 a 5 estrellas.
        /// </summary>
        [Fact(DisplayName = "4. Validador de CreateProductReviewCommand aprueba comandos válidos")]
        public void Validator_ValidCommand_Passes()
        {
            var validator = new CreateProductReviewCommandValidator();
            var command = new CreateProductReviewCommand(Guid.NewGuid(), Guid.NewGuid(), 4, "Muy bueno");
            var result = validator.Validate(command);

            Assert.True(result.IsValid);
        }

        /// <summary>
        /// Objetivo: Validar que el validador rechace puntuaciones menores a 1 o mayores a 5.
        /// </summary>
        [Theory(DisplayName = "5. Validador de CreateProductReviewCommand rechaza calificaciones fuera del rango 1 a 5")]
        [InlineData(0)]
        [InlineData(6)]
        [InlineData(-1)]
        public void Validator_InvalidRating_Fails(int invalidRating)
        {
            var validator = new CreateProductReviewCommandValidator();
            var command = new CreateProductReviewCommand(Guid.NewGuid(), Guid.NewGuid(), invalidRating, "Comentario");
            var result = validator.Validate(command);

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "Rating");
        }
    }
}
