using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Application.Returns.Commands;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Returns;
using Zentric.Domain.Products.Enums;

namespace Zentric.Tests.Application.Returns
{
    public class FakeUnitOfWork : IUnitOfWork
    {
        public bool SaveChangesCalled { get; private set; }
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveChangesCalled = true;
            return Task.FromResult(1);
        }
    }

    public class FakeReturnRequestRepository : IReturnRequestRepository
    {
        public List<ReturnRequest> Requests { get; } = new();

        public Task AddAsync(ReturnRequest request, CancellationToken cancellationToken = default)
        {
            Requests.Add(request);
            return Task.CompletedTask;
        }

        public Task<ReturnRequest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Requests.FirstOrDefault(r => r.Id == id));
        }

        public Task UpdateAsync(ReturnRequest request, CancellationToken cancellationToken = default)
        {
            var existing = Requests.FirstOrDefault(r => r.Id == request.Id);
            if (existing != null)
            {
                Requests.Remove(existing);
                Requests.Add(request);
            }
            return Task.CompletedTask;
        }
    }

    public class RequestReturnCommandHandlerTests
    {
        [Fact]
        public async Task Handle_ValidCommand_CreatesReturnRequestAndSaves()
        {
            var repository = new FakeReturnRequestRepository();
            var unitOfWork = new FakeUnitOfWork();
            var handler = new RequestReturnCommandHandler(repository, unitOfWork);

            var command = new RequestReturnCommand(
                CustomerOrderId: Guid.NewGuid(),
                VariantId: Guid.NewGuid(),
                WarehouseId: Guid.NewGuid(),
                Quantity: 2,
                ProductType: ProductType.Physical
            );

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.NotEqual(Guid.Empty, result.Value);
            
            var savedReq = repository.Requests.SingleOrDefault(r => r.Id == result.Value);
            Assert.NotNull(savedReq);
            Assert.Equal(2, savedReq.Quantity);
            Assert.True(unitOfWork.SaveChangesCalled);
        }
    }
}
