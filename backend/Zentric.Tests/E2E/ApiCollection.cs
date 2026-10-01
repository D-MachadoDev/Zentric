using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Coleccion unica para toda la suite E2E.
    ///
    /// Existe por dos razones concrete. Una: el contenedor PostgreSQL se levanta una vez y se
    /// comparte, que es lo que hace viable arrancar la suite completa. Dos, y la importante:
    /// xUnit ejecuta en paralelo las colecciones distintas, y varias pruebas E2E dependen del
    /// mismo esenario sembrado (un pedido pagado, un vendedor, un comprador ajeno). Sin esta
    /// coleccion, dos clases competirían por los mismos datos.
    /// </summary>
    [CollectionDefinition(Name)]
    public sealed class ApiCollection : ICollectionFixture<ZentricApiFactory>
    {
        /// <summary>Nombre de la coleccion. Lo consumen las clases con <c>[Collection]</c>.</summary>
        public const string Name = "zentric-api-e2e";
    }
}