using Zentric.Application.Common.Ports;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Api.Bootstrap
{
    /// <summary>
    /// Alta del primer Administrador (ADR-0009).
    ///
    /// Sin esto el sistema no arranca de forma utilizable: el auto-registro anonimo solo permite
    /// crear Compradores (ZENTRIC.md, Dominio 3), y un Comprador no puede crear al Administrador.
    /// Es la unica via por la que un rol privilegiado entra al sistema, y por eso exige configuracion
    /// explicita: si no se definen Bootstrap__*, no se crea nadie.
    ///
    /// Vive en su propia clase, y no como bloque suelto dentro de <c>Program.cs</c>, por una razon
    /// concreta: las pruebas E2E necesitan ejecutarlo. Bajo <c>WebApplicationFactory</c> el evento
    /// <c>ApplicationStarted</c> no se dispara (el runner arranca el host con
    /// <c>IHost.StartAsync()</c>, que no notifica el arranque), asi que el bloque en linea nunca se
    /// ejecutaba en las pruebas y el arnes se quedaba sin Administrador. Extraerlo deja UNA sola
    /// implementacion que el arranque real y las pruebas comparten, en vez de dos que divergen.
    /// </summary>
    public static class AdministratorBootstrapper
    {
        /// <summary>
        /// Identificador canónico y determinista para la vendedora Valeria Mendoza (ADR-0009 / R1).
        /// Requerido por frontend y contratos para evitar discrepancias de sesión.
        /// </summary>
        public static readonly Guid CanonicalSellerId = Guid.Parse("0b01129d-c0a9-4325-8394-4b9e636a4e88");

        /// <summary>
        /// Crea el Administrador inicial si y solo si no existe ya ninguno, de modo que un
        /// despliegue no lo duplique en cada reinicio. No hace nada si faltan las credenciales.
        /// </summary>
        /// <param name="services">Proveedor del host ya construido.</param>
        /// <param name="config">Configuracion de la aplicacion.</param>
        public static void Run(IServiceProvider services, IConfiguration config)
        {
            var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("Zentric.Bootstrap");

            string email = config["Bootstrap:AdministratorEmail"] ?? "admin@zentric.local";
            string password = config["Bootstrap:AdministratorPassword"] ?? "AdminLocal12345";

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                logger.LogWarning(
                    "No se creo el administrador inicial: faltan Bootstrap:AdministratorEmail o Bootstrap:AdministratorPassword. Solo podran registrarse Compradores.");
                return;
            }

            using var scope = services.CreateScope();
            var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
            var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

            bool changed = false;

            var existing = users.GetAllAsync(UserRole.Administrator).GetAwaiter().GetResult();

            if (existing.Count == 0)
            {
                var admin = new User(
                    config["Bootstrap:AdministratorIdentityDocument"] ?? "DOC-BOOTSTRAP-0001",
                    new FullName(config["Bootstrap:AdministratorFullName"] ?? "Administrador Inicial"),
                    new Email(email),
                    hasher.Hash(password),
                    UserRole.Administrator);

                users.AddAsync(admin).GetAwaiter().GetResult();
                changed = true;
                logger.LogWarning(
                    "Administrador inicial creado con el correo {Email}. Cambie la contrasena y retire Bootstrap__* de la configuracion.",
                    email);
            }

            // Cuentas canonicas de QA para pruebas locales y operacion determinista (sin credenciales aleatorias)
            var qaAccounts = new (string Doc, string Name, string Email, string Pass, UserRole Role, Guid? Id)[]
            {
                ("DOC-SELLER-001", "Valeria Mendoza (vendedor)", "seller@zentric.local", "SellerLocal12345", UserRole.Seller, CanonicalSellerId),
                ("DOC-BUYER-001", "Andrés Castillo (comprador)", "buyer@zentric.local", "BuyerLocal12345", UserRole.Buyer, null),
                ("DOC-LOG-001", "Camila Ríos (logística)", "logistics@zentric.local", "LogisticsLocal12345", UserRole.LogisticsOperator, null),
                ("DOC-SUP-001", "Mateo Vargas (supervisor)", "supervisor@zentric.local", "SupervisorLocal12345", UserRole.Supervisor, null)
            };

            foreach (var qa in qaAccounts)
            {
                var existingUser = users.GetByEmailAsync(new Email(qa.Email)).GetAwaiter().GetResult();
                if (existingUser is null)
                {
                    var newUser = new User(
                        qa.Doc,
                        new FullName(qa.Name),
                        new Email(qa.Email),
                        hasher.Hash(qa.Pass),
                        qa.Role)
                    {
                        Id = qa.Id ?? Guid.NewGuid()
                    };

                    users.AddAsync(newUser).GetAwaiter().GetResult();
                    changed = true;
                    logger.LogInformation("Usuario canonico QA creado: {Email} ({Role}) con ID {UserId}", qa.Email, qa.Role, newUser.Id);
                }
                else if (existingUser.Status == UserStatus.Blocked)
                {
                    existingUser.Activate();
                    changed = true;
                    logger.LogInformation("Usuario canonico QA reactivado: {Email}", qa.Email);
                }
            }

            if (changed)
            {
                unitOfWork.SaveChangesAsync().GetAwaiter().GetResult();
            }

            // Sembrado de catálogo, bodegas e inventarios para Valeria Mendoza y el marketplace
            CatalogSeeder.Seed(scope.ServiceProvider, logger);
        }
    }
}