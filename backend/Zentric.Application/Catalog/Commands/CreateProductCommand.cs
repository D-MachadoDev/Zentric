using Zentric.Application.Common.Messaging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Application.Catalog.Commands
{
    public record VariantAttributeDto(string Name, string Value);
    public record CreateProductVariantDto(string Sku, List<VariantAttributeDto> Attributes);

    /// <summary>
    /// Identificadores que devuelve el alta de un producto.
    ///
    /// <c>ProductId</c> identifica el producto y <c>VariantIds</c> las variantes creadas. Un
    /// producto Fisico siempre nace con al menos una variante (Q-10 = C3, ADR-0003); uno Digital
    /// puede nacer sin ninguna, y entonces la lista llega vacia. Por eso es una LISTA y no un
    /// <c>Guid</c> suelto: la forma del contrato no depende de lo que se pidio, y el frontend no
    /// tiene que decidir de antemano si espera un valor o una coleccion.
    ///
    /// Se devuelven los dos porque el Vendedor necesita el <c>variantId</c> para dar de alta stock
    /// justo despues de crear el producto. Sin el tendria que hacer un GET extra al recurso recien
    /// creado solo para sacar una clave que el propio servidor acaba de generar.
    /// </summary>
    public record CreatedProductDto(Guid ProductId, IReadOnlyList<Guid> VariantIds);

    public record CreateProductCommand(
        string Name,
        string Description,
        decimal PriceAmount,
        string PriceCurrency,
        Guid VendorId,
        ProductType Type,
        List<CreateProductVariantDto>? Variants = null,
        string? ImageUrl = null) : IRequest<Result<CreatedProductDto>>;

    public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, Result<CreatedProductDto>>
    {
        private readonly IProductRepository _repository;
        private readonly IUnitOfWork _unitOfWork;

        public CreateProductCommandHandler(IProductRepository repository, IUnitOfWork unitOfWork)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<CreatedProductDto>> Handle(CreateProductCommand request, CancellationToken cancellationToken)
        {
            var variants = request.Variants?.Select(v => 
                (v.Sku, v.Attributes.Select(a => new VariantAttribute(a.Name, a.Value)))
            ).ToList();

            var price = new Money(request.PriceAmount, request.PriceCurrency);

            var product = new Product(
                request.Name,
                request.Description,
                price,
                request.VendorId,
                request.Type,
                variants,
                request.ImageUrl
            );

            await _repository.AddAsync(product, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<CreatedProductDto>.Success(new CreatedProductDto(
                product.Id,
                product.Variants.Select(v => v.Id).ToList()));
        }
    }
}
