using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;

namespace Zentric.Infrastructure.Persistence
{
    /// <summary>
    /// Reemplaza el estado persistido de una raiz de agregado por el que trae
    /// el agregado de dominio.
    ///
    /// <para>
    /// El problema que resuelve: los repositorios de este proyecto mapean el
    /// agregado a un <c>DbModel</c> NUEVO y luego lo escriben. Si la fila ya
    /// esta rastreada en este mismo <see cref="ZentricDbContext"/> (mismo
    /// ambito, por ejemplo tras un <c>Add</c> seguido de un <c>Update</c>),
    /// EF Core rechaza el segundo <c>Update</c> con "another instance with the
    /// same key value is already being tracked" (H-15).
    /// </para>
    ///
    /// <para>
    /// La solucion NO es evitar <c>Update</c> a cambio de <c>Attach</c> +
    /// <c>State = Modified</c>: <c>Attach</c> recorre el grafo en estado
    /// <c>Unchanged</c>, y los tipos <c>owned</c> (por ejemplo
    /// <c>BuyerDbModel.MainAddress</c>) quedan fuera del UPDATE, de modo que
    /// un cambio de direccion se pierde en silencio.
    /// </para>
    ///
    /// <para>
    /// Lo que si funciona: desvincular la fila rastreada que tenga la misma
    /// clave y despues marcar el grafo nuevo como <c>Modified</c> completo.
    /// <c>Update</c> marca TODO el grafo (raiz + owned) como Modified, con lo
    /// que los owned si viajan al UPDATE. La desvinculacion evita el choque
    /// de claves y es idempotente: si no hay nada rastreado, no hace nada.
    /// </para>
    /// </summary>
    internal static class TrackedState
    {
        /// <summary>
        /// Sustituye la fila persistida de <paramref name="dbModel"/> por su
        /// estado actual, resolviendo el choque de rastreo (H-15).
        /// </summary>
        /// <typeparam name="TEntity">Tipo de la raiz de agregado.</typeparam>
        /// <param name="dbContext">Contexto de la unidad de trabajo.</param>
        /// <param name="set">DbSet de la entidad.</param>
        /// <param name="dbModel">Estado deseado, ya mapeado desde el dominio.</param>
        /// <param name="keySelector">Extrae la clave primaria del modelo mapeado.</param>
        public static void ReplaceAsModified<TEntity>(
            ZentricDbContext dbContext,
            DbSet<TEntity> set,
            TEntity dbModel,
            Func<TEntity, object> keySelector)
            where TEntity : class
        {
            var key = keySelector(dbModel);

            // Desvincula la fila rastreada con la MISMA clave: si no, EF Core
            // rechaza el Update por doble rastreo de la misma clave primaria.
            var tracked = set.Local.FirstOrDefault(entity => Equals(keySelector(entity), key));
            if (tracked is not null)
            {
                dbContext.Entry(tracked).State = EntityState.Detached;
            }

            // Update marca el grafo completo (raiz + owned) como Modified, que
            // es lo que hace que los owned viajen en el UPDATE.
            set.Update(dbModel);
        }
    }
}
