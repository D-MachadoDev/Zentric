using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Returns.Commands;
using Zentric.Domain.Returns;
using Zentric.Domain.Returns.Enums;
using Zentric.Domain.Returns.Services;
using Zentric.Domain.Products.Enums;

namespace Zentric.Tests.Application.Returns
{
    public class ApproveReturnCommandHandlerTests
    {
        [Fact]
        public async Task Handle_ValidCommand_ApprovesAndSaves()
        {
            var repository = new FakeReturnRequestRepository();
            var unitOfWork = new FakeUnitOfWork();
            var service = new ReturnsApprovalService();
            var handler = new ApproveReturnCommandHandler(repository, unitOfWork, service);

            var returnReq = new ReturnRequest(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, ProductType.Physical);
            returnReq.InspectByLogistics(true);
            await repository.AddAsync(returnReq);

            var command = new ApproveReturnCommand(returnReq.Id, false);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            
            var savedReq = await repository.GetByIdAsync(returnReq.Id);
            Assert.NotNull(savedReq);
            Assert.Equal(ReturnStatus.Approved, savedReq.Status);
            Assert.True(savedReq.VendorApproved);
            Assert.True(unitOfWork.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_InvalidCondition_ReturnsFailure()
        {
            var repository = new FakeReturnRequestRepository();
            var unitOfWork = new FakeUnitOfWork();
            var service = new ReturnsApprovalService();
            var handler = new ApproveReturnCommandHandler(repository, unitOfWork, service);

            var returnReq = new ReturnRequest(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, ProductType.Physical);
            // Not inspected by logistics
            await repository.AddAsync(returnReq);

            var command = new ApproveReturnCommand(returnReq.Id, false);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Contains("inspected as good condition", result.Error);
        }
    }
}
