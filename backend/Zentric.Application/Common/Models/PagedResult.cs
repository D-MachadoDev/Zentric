using System;

namespace Zentric.Application.Common.Models
{
    /// <summary>
    /// Pagina pedida por el cliente. El indice es de base cero, como
    /// `Skip/Take` de EF Core y como espera un frontend paginado.
    ///
    /// Referencia: backendSDD/Application/01-use-cases-and-ports.md y el riesgo
    /// API4 (recurso sin limitacion) del SDD.
    /// </summary>
    public readonly record struct PageRequest
    {
        /// <summary>Tamano maximo admitido. Evita que un cliente pida toda la tabla.</summary>
        public const int MaxPageSize = 100;

        /// <summary>Tamano por defecto cuando el cliente no lo especifica.</summary>
        public const int DefaultPageSize = 20;

        /// <summary>
        /// Constructor sin parametros. Es explicito porque en un
        /// <c>record struct</c> el constructor implicito pondria Size en 0 en
        /// lugar de aplicar el tamano por defecto.
        /// </summary>
        public PageRequest() : this(0, DefaultPageSize)
        {
        }

        public PageRequest(int page, int size)
        {
            // Se acotan en el borde: un size negativo o enorme se corrige en
            // lugar de rechazar la peticion, para no romper al cliente. El 0
            // tambien cae al default: un cliente puede mandar size=0.
            Page = page < 0 ? 0 : page;
            Size = size switch
            {
                <= 0 => DefaultPageSize,
                > MaxPageSize => MaxPageSize,
                _ => size
            };
        }

        /// <summary>Semilla de la pagina: el constructor obliga a pasar los valores.</summary>
        public static PageRequest First => new(0, DefaultPageSize);

        public int Page { get; }
        public int Size { get; }

        public int Skip => Page * Size;
        public int Take => Size;
    }

    /// <summary>
    /// Pagina de resultados con los metadatos que el cliente necesita para
    /// construir sus controles de paginacion.
    /// </summary>
    public sealed record PagedResult<T>(
        IReadOnlyList<T> Items,
        int Page,
        int Size,
        int TotalItems)
    {
        public int TotalPages => Size <= 0 ? 0 : (int)Math.Ceiling(TotalItems / (double)Size);

        public bool HasPrevious => Page > 0;
        public bool HasNext => Page + 1 < TotalPages;
    }
}