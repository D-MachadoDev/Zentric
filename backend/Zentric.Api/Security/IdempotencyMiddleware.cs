using System.Text;
using Microsoft.EntityFrameworkCore;
using Zentric.Infrastructure.Persistence;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Api.Security
{
    // Returns the cached response for duplicate POST/PATCH requests
    // that carry the same Idempotency-Key header.
    public class IdempotencyMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<IdempotencyMiddleware> _logger;

        public IdempotencyMiddleware(RequestDelegate next, ILogger<IdempotencyMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, ZentricDbContext db)
        {
            // Only applies to POST/PATCH with an idempotency key header.
            var key = context.Request.Headers["Idempotency-Key"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(key) ||
                !HttpMethods.IsPost(context.Request.Method) &&
                !HttpMethods.IsPatch(context.Request.Method))
            {
                await _next(context);
                return;
            }

            // Check if we already processed this key.
            var existing = await db.IdempotencyKeys
                .FirstOrDefaultAsync(k => k.Key == key, context.RequestAborted);

            if (existing != null)
            {
                // Return cached response.
                context.Response.StatusCode = existing.ResponseStatusCode;
                context.Response.ContentType = "application/json";
                if (existing.ResponseBody != null)
                {
                    await context.Response.WriteAsync(existing.ResponseBody, context.RequestAborted);
                }
                return;
            }

            // Capture the response body so we can cache it.
            var originalBody = context.Response.Body;
            using var buffer = new MemoryStream();
            context.Response.Body = buffer;

            await _next(context);

            // Cache the response for future duplicate requests.
            var responseBody = Encoding.UTF8.GetString(buffer.ToArray());
            context.Response.Body = originalBody;
            await context.Response.Body.WriteAsync(buffer.ToArray(), context.RequestAborted);

            if (context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)
            {
                db.IdempotencyKeys.Add(new IdempotencyKeyDbModel
                {
                    Id = Guid.NewGuid(),
                    Key = key,
                    RequestPath = context.Request.Path,
                    RequestMethod = context.Request.Method,
                    ResponseStatusCode = context.Response.StatusCode,
                    ResponseBody = responseBody,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddHours(24)
                });
                await db.SaveChangesAsync(context.RequestAborted);
            }
        }
    }
}