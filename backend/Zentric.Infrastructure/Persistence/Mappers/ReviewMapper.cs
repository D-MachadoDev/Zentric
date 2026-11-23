using System;
using System.Collections.Generic;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Zentric.Domain.Products;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Mappers
{
    public static class ReviewMapper
    {
        public static Review ToDomain(ReviewDbModel dbModel)
        {
            var review = (Review)RuntimeHelpers.GetUninitializedObject(typeof(Review));

            typeof(Review).GetProperty("Id")?.SetValue(review, dbModel.Id);
            typeof(Review).GetProperty("ProductId")?.SetValue(review, dbModel.ProductId);
            typeof(Review).GetProperty("UserId")?.SetValue(review, dbModel.UserId);
            typeof(Review).GetProperty("BuyerName")?.SetValue(review, string.IsNullOrWhiteSpace(dbModel.BuyerName) ? "Comprador verificado" : dbModel.BuyerName);
            typeof(Review).GetProperty("Rating")?.SetValue(review, dbModel.Rating);
            typeof(Review).GetProperty("Comment")?.SetValue(review, dbModel.Comment);

            var urls = string.IsNullOrWhiteSpace(dbModel.ImageUrlsJson)
                ? (IReadOnlyList<string>)Array.Empty<string>()
                : JsonSerializer.Deserialize<List<string>>(dbModel.ImageUrlsJson) ?? (IReadOnlyList<string>)Array.Empty<string>();
            typeof(Review).GetProperty("ImageUrls")?.SetValue(review, urls);

            typeof(Review).GetProperty("CreatedAt")?.SetValue(review, dbModel.CreatedAt);
            typeof(Review).GetProperty("UpdatedAt")?.SetValue(review, dbModel.UpdatedAt);

            return review;
        }

        public static ReviewDbModel ToDbModel(Review domain)
        {
            var json = domain.ImageUrls != null && domain.ImageUrls.Count > 0
                ? JsonSerializer.Serialize(domain.ImageUrls)
                : null;

            return new ReviewDbModel
            {
                Id = domain.Id,
                ProductId = domain.ProductId,
                UserId = domain.UserId,
                BuyerName = domain.BuyerName,
                Rating = domain.Rating,
                Comment = domain.Comment,
                ImageUrlsJson = json,
                CreatedAt = domain.CreatedAt,
                UpdatedAt = domain.UpdatedAt
            };
        }
    }
}
