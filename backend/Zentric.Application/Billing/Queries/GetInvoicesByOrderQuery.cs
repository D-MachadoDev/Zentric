using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Domain.Billing.Ports;

namespace Zentric.Application.Billing.Queries
{
    public record InvoiceDto(
        Guid Id,
        Guid CustomerOrderId,
        Guid? VendorId,
        string Type,
        decimal TotalAmount,
        string Currency,
        DateTime IssuedAt);

    public record GetInvoicesByOrderQuery(Guid OrderId) : IRequest<Result<IReadOnlyList<InvoiceDto>>>;

    public class GetInvoicesByOrderQueryHandler : IRequestHandler<GetInvoicesByOrderQuery, Result<IReadOnlyList<InvoiceDto>>>
    {
        private readonly IInvoiceRepository _invoiceRepository;

        public GetInvoicesByOrderQueryHandler(IInvoiceRepository invoiceRepository)
        {
            _invoiceRepository = invoiceRepository;
        }

        public async Task<Result<IReadOnlyList<InvoiceDto>>> Handle(GetInvoicesByOrderQuery request, CancellationToken cancellationToken)
        {
            var invoices = await _invoiceRepository.GetByOrderIdAsync(request.OrderId, cancellationToken);
            var dtos = invoices.Select(i => new InvoiceDto(
                i.Id,
                i.CustomerOrderId,
                i.VendorId,
                i.Type.ToString(),
                i.TotalAmount.Amount,
                i.TotalAmount.Currency,
                i.IssuedAt
            )).ToList();

            return Result<IReadOnlyList<InvoiceDto>>.Success(dtos);
        }
    }
}
