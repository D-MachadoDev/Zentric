using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Un actor con token: un usuario de la matriz, ya autenticado.
    ///
    /// Existe para que las pruebas lean como criterios de aceptacion ("el vendedor no crea
    /// carrito") y no como codigo de plumbing ("Bearer " + token + ruta + metodo).
    /// </summary>
    public sealed record ApiActor(string Role, string Email, string Token);

    /// <summary>
    /// Siembra el escenario comun: un Administrador y un usuario de cada rol, con su token.
    ///
    /// Los correos son fijos porque el contenedor nace vacio en cada corrida; el smoke versionado
    /// usa sellos de tiempo porque comparte una base de datos persistente, que es justo la
    /// diferencia entre las dos estrategias.
    /// </summary>
    public sealed class ApiActors
    {
        private readonly ZentricApiFactory _factory;
        private readonly SemaphoreSlim _gate = new(1, 1);
        private IReadOnlyDictionary<string, ApiActor>? _cached;

        public ApiActors(ZentricApiFactory factory) => _factory = factory;

        /// <summary>Administrador. Se autentica contra el bloque de bootstrap del arranque.</summary>
        public ApiActor Admin => Get()["Admin"];

        /// <summary>Comprador propietario del escenario.</summary>
        public ApiActor Buyer => Get()["Buyer"];

        /// <summary>Segundo comprador: existe para probar la propiedad cruzada (Q-21b).</summary>
        public ApiActor Buyer2 => Get()["Buyer2"];

        /// <summary>Vendedor propietario del producto.</summary>
        public ApiActor Seller => Get()["Seller"];

        /// <summary>Segundo vendedor: mismo motivo que <see cref="Buyer2"/>.</summary>
        public ApiActor Seller2 => Get()["Seller2"];

        /// <summary>Operador logistico.</summary>
        public ApiActor Operator => Get()["Operator"];

        /// <summary>Supervisor: solo lectura y auditoria (ADR-0014).</summary>
        public ApiActor Supervisor => Get()["Supervisor"];

        /// <summary>
        /// Devuelve el actor por nombre de rol logico, o el token vacio para el anonimo.
        /// La cadena vacia es lo que produce una peticion sin cabecera Authorization.
        /// </summary>
        public string TokenOf(string actor) =>
            actor == "Anonymous" ? string.Empty : Get()[actor].Token;

        /// <summary>Devuelve un <see cref="HttpClient"/> ya autenticado con el token del actor.</summary>
        public HttpClient ClientFor(string actor)
        {
            var client = _factory.CreateClient();
            var token = TokenOf(actor);

            if (!string.IsNullOrEmpty(token))
            {
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            }

            return client;
        }

        private IReadOnlyDictionary<string, ApiActor> Get()
        {
            if (_cached is not null)
            {
                return _cached;
            }

            _gate.Wait();

            try
            {
                _cached ??= SeedAsync().GetAwaiter().GetResult();
                return _cached;
            }
            finally
            {
                _gate.Release();
            }
        }

        private async Task<IReadOnlyDictionary<string, ApiActor>> SeedAsync()
        {
            var adminToken = await LoginAsync(ZentricApiFactory.AdminEmail, ZentricApiFactory.AdminPassword);

            // El nombre completo exige dos palabras, de dos caracteres o mas y sin digitos (FullName).
            // Cumplirlo aqui evita que una prueba falle por un 400 que no es el que quiere comprobar.
            var seed = new (string Key, string Role, string FullName)[]
            {
                ("Buyer", "Buyer", "Comprador Uno"),
                ("Buyer2", "Buyer", "Comprador Dos"),
                ("Seller", "Seller", "Vendedor Uno"),
                ("Seller2", "Seller", "Vendedor Dos"),
                ("Operator", "LogisticsOperator", "Operador Logistico"),
                ("Supervisor", "Supervisor", "Super Uno"),
            };

            var actors = new Dictionary<string, ApiActor>(StringComparer.Ordinal)
            {
                ["Admin"] = new ApiActor("Administrator", ZentricApiFactory.AdminEmail, adminToken),
            };

            var document = 1000;

            foreach (var (key, role, fullName) in seed)
            {
                document++;
                var email = $"e2e-{key.ToLowerInvariant()}@zentric-e2e.test";

                // Q-22 (ADR-0012): el rol viaja por nombre. Un entero responderia 400 y la siembra
                // fallaria por un contrato que estas pruebas precisamente quieren verificar.
                await CreateUserAsync(adminToken, email, fullName, $"DOC-E2E-{document}", role);

                actors[key] = new ApiActor(role, email, await LoginAsync(email, ZentricApiFactory.ActorPassword));
            }

            return actors;
        }

        private async Task<string> LoginAsync(string email, string password)
        {
            using var client = _factory.CreateClient();
            using var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException(
                    $"El login de {email} respondio HTTP {(int)response.StatusCode}: {body}");
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            return json.GetProperty("token").GetString()!;
        }

        private async Task CreateUserAsync(string token, string email, string fullName, string identityDocument, string role)
        {
            using var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            using var response = await client.PostAsJsonAsync("/api/users", new
            {
                email,
                fullName,
                identityDocument,
                password = ZentricApiFactory.ActorPassword,
                role,
            });

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException(
                    $"No se pudo crear el actor {role} ({email}): HTTP {(int)response.StatusCode}: {body}");
            }
        }
    }
}