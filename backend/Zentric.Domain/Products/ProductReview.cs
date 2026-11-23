using System;
using System.Collections.Generic;
using System.Linq;

namespace Zentric.Domain.Products
{
    /// <summary>
    /// Entidad de dominio que representa la calificación y opinión de un comprador sobre un producto.
    /// </summary>
    public sealed class ProductReview
    {
        public Guid Id { get; init; }
        public Guid ProductId { get; private set; }
        public Guid BuyerId { get; private set; }
        public string BuyerName { get; private set; }
        public int Rating { get; private set; }
        public string? Comment { get; private set; }
        public IReadOnlyList<string> ImageUrls { get; private set; }
        public DateTime CreatedAtUtc { get; private set; }

        private ProductReview()
        {
            BuyerName = "Comprador verificado";
            ImageUrls = Array.Empty<string>();
        }

        public ProductReview(
            Guid productId,
            Guid buyerId,
            int rating,
            string? comment = null,
            string? buyerName = null,
            IEnumerable<string>? imageUrls = null)
        {
            if (productId == Guid.Empty)
            {
                throw new ArgumentException("El identificador de producto no puede estar vacío.", nameof(productId));
            }

            if (buyerId == Guid.Empty)
            {
                throw new ArgumentException("El identificador del comprador no puede estar vacío.", nameof(buyerId));
            }

            if (rating < 1 || rating > 5)
            {
                throw new ArgumentOutOfRangeException(nameof(rating), "La calificación debe estar entre 1 y 5.");
            }

            if (comment != null && comment.Trim().Length > 2000)
            {
                throw new ArgumentException("El comentario no puede superar los 2000 caracteres.", nameof(comment));
            }

            Id = Guid.NewGuid();
            ProductId = productId;
            BuyerId = buyerId;
            Rating = rating;
            Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
            BuyerName = string.IsNullOrWhiteSpace(buyerName) ? "Comprador verificado" : buyerName.Trim();
            ImageUrls = imageUrls?.Where(u => !string.IsNullOrWhiteSpace(u)).Select(u => u.Trim()).Distinct().ToList()
                ?? (IReadOnlyList<string>)Array.Empty<string>();
            CreatedAtUtc = DateTime.UtcNow;
        }

        /// <summary>
        /// Calcula el promedio ponderado redondeado a 2 decimales y el conteo total a partir de una colección de reseñas.
        /// </summary>
        public static (decimal AverageRating, int ReviewsCount) CalculateRatings(IEnumerable<ProductReview> reviews)
        {
            var list = reviews?.ToList() ?? new List<ProductReview>();
            if (list.Count == 0)
            {
                return (0m, 0);
            }

            var average = (decimal)list.Average(r => r.Rating);
            return (Math.Round(average, 2, MidpointRounding.AwayFromZero), list.Count);
        }
    }
}
