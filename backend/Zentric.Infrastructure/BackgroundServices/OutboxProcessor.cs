using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Zentric.Infrastructure.Persistence;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.BackgroundServices
{
    // Picks up unprocessed outbox messages and marks them done.
    public sealed class OutboxProcessor : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<OutboxProcessor> _logger;

        public OutboxProcessor(IServiceProvider services, ILogger<OutboxProcessor> logger)
        {
            _services = services;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _services.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<ZentricDbContext>();

                    var pending = await db.OutboxMessages
                        .Where(m => m.ProcessedAt == null)
                        .OrderBy(m => m.OccurredAt)
                        .Take(50)
                        .ToListAsync(stoppingToken);

                    foreach (var msg in pending)
                    {
                        try
                        {
                            // In V1 we just mark as processed.
                            // Real dispatch will be wired when event handlers exist.
                            msg.ProcessedAt = DateTime.UtcNow;
                        }
                        catch (Exception ex)
                        {
                            msg.RetryCount++;
                            msg.LastError = ex.Message;
                            _logger.LogError(ex, "Failed to process outbox message {Id}", msg.Id);
                        }
                    }

                    await db.SaveChangesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Outbox processor loop failed");
                }

                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }
}