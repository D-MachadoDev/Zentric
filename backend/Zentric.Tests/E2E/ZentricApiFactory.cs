using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Testcontainers.PostgreSql;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// T-032: levanta la API REAL contra un PostgreSQL efimero (Testcontainers).
    ///
    /// No es un doble de prueba: se ejecuta el mismo <c>Program</c> de <c>Zentric.Api</c>, con los
    /// mismos middleware, la misma politica de reserva, los mismos filtros de dueno y los mismos
    /// serializadores. Lo unico que se sustituye es la base de datos, que es efimera y nace limpia.
    ///
    /// Por que Postgres real y no un almacen en memoria: el contrato HTTP que hay que verificar
    /// incluye migraciones, tipos de columna y el <c>saveChanges</c> de EF Core. Un almacen en
    /// memoria pasaria esas pruebas sin ejecutar una sola sentencia, que es justo el defecto que
    /// este trabajo viene a cerrar.
    /// </summary>
    public sealed class ZentricApiFactory : WebApplicationFactory<Program>
    {
        /// <summary>Correo del Administrador que crea el bloque de bootstrap del arranque.</summary>
        public const string AdminEmail = "admin@zentric-e2e.test";

        /// <summary>Contrasena del Administrador de arranque. Credencial de pruebas, nunca de despliegue.</summary>
        public const string AdminPassword = "Sm0ke!E2epass";

        /// <summary>Contrasena de los actores de la matriz. Mismo criterio que el del Administrador.</summary>
        public const string ActorPassword = "Sm0ke!E2epass";

        // La MISMA imagen que docker-compose.yml. Si el esquema se levanta contra otra version, la
        // prueba puede pasar donde el despliegue real falla, que es el falso verde que se quiere evitar.
        private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16.15-alpine").Build();

        /// <summary>
        /// Arranca el contenedor de forma sincrona y deliberadamente ruidosa: si Docker no esta
        /// accesible, el fallo tiene que saltar aqui y no dentro de una prueba concreta, que dejaria
        /// el resto de la suite en verde y el fallo escondido entre otras. Es el mismo motivo por el
        /// que el smoke versionado se corrigio para salir siempre con codigo explicito.
        /// </summary>
        public ZentricApiFactory()
        {
            try
            {
                _postgres.StartAsync().GetAwaiter().GetResult();
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException(
                    "T-032 necesita un motor Docker accesible. Arranca Docker Desktop y vuelve a lanzar " +
                    "los tests; sin el no se puede levantar el PostgreSQL efimero.", ex);
            }
        }

        /// <summary>Clave de firma de las pruebas: 64 bytes, muy por encima del minimo HS256 de 32.</summary>
        private const string TestSigningKey = "zentric-e2e-firma-solo-para-pruebas-automaticas-cambiar-0001";

        /// <summary>
        /// Cadena de conexion del PostgreSQL efimero. La expone el arnés para poder diagnosticar
        /// una siembra fallida desde una prueba, sin adivinar: si el Administrador no aparece en la
        /// tabla, el problema es el arranque, y eso solo se ve mirando los datos.
        /// </summary>
        public string ConnectionString => _postgres.GetConnectionString();

        private ApiActors? _actors;

        /// <summary>
        /// Actores del escenario (un usuario por rol, con token), sembrados la primera vez que se
        /// piden. Vive en el factory y no como fixture aparte porque xUnit no resuelve el
        /// constructor de un fixture de coleccion a partir de otro fixture de la MISMA coleccion:
        /// declararlos juntos falla al resolver <c>ZentricApiFactory factory</c>. Ademas, que la
        /// siembra sea perezosa garantiza que ocurra una sola vez para toda la suite y no una por
        /// prueba, que es lo que hacia fallar la segunda con "user already exists".
        /// </summary>
        public ApiActors Actors => _actors ??= new ApiActors(this);

        private PaidOrderScenario? _paidOrder;

        /// <summary>
        /// Escenario de negocio completo (producto, stock, carrito, pago, facturas y devolucion).
        /// Perezoso como los actores y por el mismo motivo: se siembra una sola vez para toda la
        /// suite, y varias pruebas leen el mismo pedido pagado.
        /// </summary>
        public PaidOrderScenario PaidOrder => _paidOrder ??= new PaidOrderScenario(Actors);

        /// <inheritdoc />
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            // Development es lo que habilita la aplicacion automatica de migraciones al arrancar
            // (Program.cs). Asi esta suite verifica tambien ese camino, contra una base limpia.
            builder.UseEnvironment(Environments.Development);
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(Overrides()));
        }

        /// <inheritdoc />
        protected override IHost CreateHost(IHostBuilder builder)
        {
            // Se aplica tambien como configuracion de host: el arranque minimo de .NET lee la
            // configuracion antes de que exista el builder de la aplicacion, y sin esto la clave de
            // firma llegaria vacia y JwtOptions.Validate() tumbaria el arranque.
            builder.ConfigureHostConfiguration(config => config.AddInMemoryCollection(Overrides()));

            // El alta del Administrador se ejecuta aqui, de forma explicita, y no dejandola en el
            // evento ApplicationStarted: WebApplicationFactory arranca el host con
            // IHost.StartAsync(), que no notifica ApplicationStarted, asi que el bloque en linea
            // nunca correria y la suite se quedaria sin Administrador para sembrar los demas roles.
            // Se invoca LA MISMA implementacion que usa el arranque real, no una copia.
            builder.ConfigureServices(services =>
                services.AddHostedService<BootstrapHostedService>(sp => new BootstrapHostedService(
                    sp.GetRequiredService<IServiceProvider>(),
                    sp.GetRequiredService<IConfiguration>())));

            return base.CreateHost(builder);
        }

        private sealed class BootstrapHostedService : IHostedService
        {
            private readonly IServiceProvider _services;
            private readonly IConfiguration _config;

            public BootstrapHostedService(IServiceProvider services, IConfiguration config)
            {
                _services = services;
                _config = config;
            }

            public Task StartAsync(CancellationToken cancellationToken)
            {
                Zentric.Api.Bootstrap.AdministratorBootstrapper.Run(_services, _config);
                return Task.CompletedTask;
            }

            public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        }

        private Dictionary<string, string?> Overrides() => new()
        {
            ["ConnectionStrings:DefaultConnection"] = _postgres.GetConnectionString(),
            ["Jwt:Issuer"] = "zentric-e2e",
            ["Jwt:Audience"] = "zentric-e2e-client",
            ["Jwt:SigningKey"] = TestSigningKey,
            ["Jwt:ExpirationMinutes"] = "60",
            ["Bootstrap:AdministratorEmail"] = AdminEmail,
            ["Bootstrap:AdministratorPassword"] = AdminPassword,
            ["Bootstrap:AdministratorIdentityDocument"] = "DOC-E2E-ADMIN",
            // FullName rechaza digitos en el nombre y el apellido, asi que el nombre de prueba
            // va en palabras y no como "E2E".
            ["Bootstrap:AdministratorFullName"] = "Administrador Pruebas",
        };

        /// <inheritdoc />
        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);

            if (disposing)
            {
                _postgres.DisposeAsync().AsTask().GetAwaiter().GetResult();
            }
        }
    }
}