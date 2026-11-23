using System;
using System.Collections.Generic;
using System.Linq;

namespace Zentric.Domain.Products
{
    public sealed class Review
    {
        public Guid Id { get; init; }
        public Guid ProductId { get; private set; }
        public Guid UserId { get; private set; }
        public Guid BuyerId => UserId;
        public string BuyerName { get; private set; }
        public int Rating { get; private set; }
        public string? Comment { get; private set; }
        public IReadOnlyList<string> ImageUrls { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime CreatedAtUtc => CreatedAt;
        public DateTime UpdatedAt { get; private set; }

        private Review()
        {
            BuyerName = "Comprador verificado";
            ImageUrls = Array.Empty<string>();
        } // For EF Core

        public Review(
            Guid productId,
            Guid userId,
            int rating,
            string? comment = null,
            string? buyerName = null,
            IEnumerable<string>? imageUrls = null)
        {
            if (productId == Guid.Empty)
            {
                throw new ArgumentException("Product ID cannot be empty.", nameof(productId));
            }

            if (userId == Guid.Empty)
            {
                throw new ArgumentException("User ID cannot be empty.", nameof(userId));
            }

            if (rating < 1 || rating > 5)
            {
                throw new ArgumentOutOfRangeException(nameof(rating), "Rating must be between 1 and 5.");
            }

            if (comment != null && comment.Trim().Length > 2000)
            {
                throw new ArgumentException("Comment cannot exceed 2000 characters.", nameof(comment));
            }

            Id = Guid.NewGuid();
            ProductId = productId;
            UserId = userId;
            Rating = rating;
            Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
            BuyerName = string.IsNullOrWhiteSpace(buyerName) ? "Comprador verificado" : buyerName.Trim();
            ImageUrls = imageUrls?.Where(u => !string.IsNullOrWhiteSpace(u)).Select(u => u.Trim()).Distinct().ToList()
                ?? (IReadOnlyList<string>)Array.Empty<string>();
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
        }

        public void Update(int rating, string? comment, string? buyerName = null, IEnumerable<string>? imageUrls = null)
        {
            if (rating < 1 || rating > 5)
            {
                throw new ArgumentOutOfRangeException(nameof(rating), "Rating must be between 1 and 5.");
            }

            if (comment != null && comment.Trim().Length > 2000)
            {
                throw new ArgumentException("Comment cannot exceed 2000 characters.", nameof(comment));
            }

            Rating = rating;
            Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
            if (!string.IsNullOrWhiteSpace(buyerName))
            {
                BuyerName = buyerName.Trim();
            }
            if (imageUrls != null)
            {
                ImageUrls = imageUrls.Where(u => !string.IsNullOrWhiteSpace(u)).Select(u => u.Trim()).Distinct().ToList();
            }
            UpdatedAt = DateTime.UtcNow;
        }
    }
}
