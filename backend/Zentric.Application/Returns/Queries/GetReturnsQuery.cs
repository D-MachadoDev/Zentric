using System;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Returns.Enums;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Returns.Queries
{
    /// <summary>
    /// Listado de devoluciones: la bandeja del Comprador que/devuelve, la del Vendedor que
    /// tiene que aprobar o rechazar, y la del Supervisor que audita.
    ///
    /// Devuelve el MISMO <see cref="ReturnRequestDto"/> que el detalle. No se crea un DTO de fila
    /// aparte a proposito: el mismo dato no debe tener dos formas segun de que pantalla venga.
    /// </summary>
    public record GetReturnsQuery(Guid CallerId, UserRole CallerRole, ReturnStatus? Status, int Page = 0, int Size = PageRequest.DefaultPageSize) : IRequest<Result<PagedResult<ReturnRequestDto>>>;

    public class GetReturnsQueryHandler : IRequestHandler<GetReturnsQuery, Result<PagedResult<ReturnRequestDto>>>
    {
        private readonly IReturnRequestRepository _returnRepository;

        public GetReturnsQueryHandler(IReturnRequestRepository returnRepository) => _returnRepository = returnRepository;

        public async Task<Result<PagedResult<ReturnRequestDto>>> Handle(
            GetReturnsQuery request, CancellationToken cancellationToken)
        {
            // Mismo reparto de roles que el detalle, para que listar y abrir no discrepen:
            // el Comprador ve las de sus pedidos, el Vendedor las de sus variantes, y Operador,
            // Administrador y Supervisor todas.
            Guid? buyerId = null;
            Guid? vendorId = null;

            switch (request.CallerRole)
            {
                case UserRole.Buyer:
                    buyerId = request.CallerId;
                    break;

                case UserRole.Seller:
                    vendorId = request.CallerId;
                    break;

                default:
                    break;
            }

            var returns = await _returnRepository.GetListAsync(buyerId, vendorId, request.Status, cancellationToken);

            var items = returns
                .Select(ret => new ReturnRequestDto(
                    ret.Id,
                    ret.CustomerOrderId,
                    ret.VariantId,
                    ret.WarehouseId,
                    ret.Quantity,
                    ret.Status.ToString(),
                    ret.IsGoodCondition,
                    ret.VendorApproved,
                    ret.CreatedAt))
                .ToList();

            var page = new PageRequest(request.Page, request.Size);
            var paged = items.Skip(page.Skip).Take(page.Take).ToList();
            return Result<PagedResult<ReturnRequestDto>>.Success(new PagedResult<ReturnRequestDto>(paged, page.Page, page.Size, items.Count));
        }
    }
}

