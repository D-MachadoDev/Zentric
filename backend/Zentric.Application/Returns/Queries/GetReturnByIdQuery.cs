using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Domain.Returns.Ports;

namespace Zentric.Application.Returns.Queries
{
    public record ReturnRequestDto(
        Guid Id,
        Guid CustomerOrderId,
        Guid VariantId,
        Guid WarehouseId,
        int Quantity,
        string Status,
        bool IsGoodCondition,
        bool VendorApproved,
        DateTime CreatedAt);

    public record GetReturnByIdQuery(Guid Id) : IRequest<Result<ReturnRequestDto>>;

    public class GetReturnByIdQueryHandler : IRequestHandler<GetReturnByIdQuery, Result<ReturnRequestDto>>
    {
        private readonly IReturnRequestRepository _returnRepository;

        public GetReturnByIdQueryHandler(IReturnRequestRepository returnRepository)
        {
            _returnRepository = returnRepository;
        }

        public async Task<Result<ReturnRequestDto>> Handle(GetReturnByIdQuery request, CancellationToken cancellationToken)
        {
            var ret = await _returnRepository.GetByIdAsync(request.Id, cancellationToken);
            if (ret == null)
            {
                return Result<ReturnRequestDto>.Failure("Return request not found.");
            }

            var dto = new ReturnRequestDto(
                ret.Id,
                ret.CustomerOrderId,
                ret.VariantId,
                ret.WarehouseId,
                ret.Quantity,
                ret.Status.ToString(),
                ret.IsGoodCondition,
                ret.VendorApproved,
                ret.CreatedAt
            );

            return Result<ReturnRequestDto>.Success(dto);
        }
    }
}
