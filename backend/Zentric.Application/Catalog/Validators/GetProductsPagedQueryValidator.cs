using FluentValidation;
using Zentric.Application.Catalog.Queries;

namespace Zentric.Application.Catalog.Validators
{
    /// <summary>
    /// Valida los filtros opcionales del listado paginado del comprador (S3).
    ///
    /// Regla: un valor presente pero fuera del contrato se rechaza con 400
    /// ProblemDetails a traves del <c>ValidationBehavior</c>,
    /// mientras que la ausencia del parametro significa "sin filtro" y nunca es error.
    /// El validador comparte los criterios con <see cref="ProductPagedFilters"/> para que
    /// el borde y la traduccion a dominio no puedan divergir.
    /// </summary>
    public class GetProductsPagedQueryValidator : AbstractValidator<GetProductsPagedQuery>
    {
        public GetProductsPagedQueryValidator()
        {
            RuleFor(x => x.Sort)
                .Must(ProductPagedFilters.IsSupportedSort)
                .When(x => !string.IsNullOrWhiteSpace(x.Sort))
                .WithMessage("'sort' must be one of: relevance, price-asc, price-desc.");

            RuleFor(x => x.Type)
                .Must(ProductPagedFilters.IsSupportedType)
                .When(x => !string.IsNullOrWhiteSpace(x.Type))
                .WithMessage("'type' must be one of: Physical, Digital.");
        }
    }
}
