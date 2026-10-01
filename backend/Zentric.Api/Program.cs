using Microsoft.EntityFrameworkCore;
using Zentric.Infrastructure.Persistence;
using Zentric.Application.Orders.Commands;
using Zentric.Infrastructure.Persistence.Repositories;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Logistics.Ports;
using Zentric.Application;
using Zentric.Application.Common.Behaviors;
using Zentric.Application.Common.Messaging;

using Microsoft.OpenApi;
using System.Reflection;
using Zentric.Api.Contracts;

var builder = WebApplication.CreateBuilder(args);

// Q-22 (ADR-0012): el contrato de los enum va por nombre y solo por nombre. El Owner dicto la
// forma estricta, asi que un cuerpo con "role": 2 responde 400 en lugar de colarse como
// Administrador. Las salidas ya devolvian nombres y la query ya los aceptaba; el cuerpo era lo
// unico que hablaba en numeros. Todo el contrato vive en EnumJsonContract.
//
// El contrato de error va aqui y no en ToProblem() porque 19 puntos de la capa de presentacion
// construyen el error a mano: arreglar solo el mapa deja 18 sin corregir.
builder.Services
    .AddControllers()
    .AddZentricEnumContract()
    .AddProblemDetailsContract();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Zentric Marketplace Backend API",
        Version = "v1",
        Description = "API Central y Core de Dominio para Zentric (gestión de marketplace, bodegas, inventarios, catálogos, pedidos, logística, devoluciones y facturación).",
        Contact = new OpenApiContact
        {
            Name = "Equipo de Desarrollo Zentric",
            Email = "soporte@zentric.internal"
        }
    });

    // Configuración del esquema de seguridad Bearer (JWT) para Swagger UI
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Ingrese el token JWT en el formato: Bearer {su_token}"
    });

    c.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer", doc, null),
            new List<string>()
        }
    });

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
});
builder.Services.AddOpenApi();

// Mapeo de errores a RFC 7807 (Problem Details), exigido por AGENTS.md, sección 3.4.
builder.Services.AddProblemDetails();

// Identidad del llamante y autenticacion (ADR-0009, cierra RG-01).
//
// La API NO acepta la cabecera X-Buyer-Id: la identidad sale unicamente de un
// token verificado. JwtOptions.Validate() hace fallar el arranque si falta la
// clave de firma, en lugar de firmar con un secreto por defecto.
builder.Services.Configure<Zentric.Infrastructure.Security.JwtOptions>(
    builder.Configuration.GetSection(Zentric.Infrastructure.Security.JwtOptions.SectionName));

builder.Services
    .AddAuthentication(Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwt = builder.Configuration
            .GetSection(Zentric.Infrastructure.Security.JwtOptions.SectionName)
            .Get<Zentric.Infrastructure.Security.JwtOptions>() ?? new Zentric.Infrastructure.Security.JwtOptions();
        jwt.Validate();

        options.MapInboundClaims = false;
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });

builder.Services.AddAuthorization(options =>
{
    // RG-01: "toda operacion debe ejecutarse por un usuario autenticado". La
    // politica de reserva hace que TODO endpoint exija token sin tener que
    // decorar los 30 controladores. Quien necesite excepcion lo declara con
    // [AllowAnonymous], como hacen POST /api/auth/login y GET /health.
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    // RG-03 (Q-21, ADR-0011): las politicas por rol se generan recorriendo la matriz de
    // AuthorizationPolicies, que es la Matriz de Responsabilidades de ZENTRIC.md escrita una
    // sola vez. No se agrega ninguna politica a mano: ponerla en el diccionario la registra
    // aqui, la exige el [Authorize] del controlador y la aserta EndpointAuthorizationMatrixTests.
    // Ningun acceso queda autorizado "por defecto": una politica con lista vacia de roles es
    // identidad sola, y esa es la unica forma de que un endpoint no pida rol.
    foreach (var rule in Zentric.Api.Security.AuthorizationPolicies.RolesByPolicy)
    {
        var policyBuilder = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser();

        if (rule.Value.Count > 0)
        {
            policyBuilder = policyBuilder.RequireRole(rule.Value);
        }

        options.AddPolicy(rule.Key, policyBuilder.Build());
    }
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<Zentric.Api.Security.ICurrentUserAccessor, Zentric.Api.Security.ClaimsUserAccessor>();

// Puerto de credenciales y emision de token. Los adaptadores son
// intercambiables: cambiar el algoritmo de hash o el formato del token no exige
// tocar Dominio ni los casos de uso. La caducidad del token se calcula con el
// mismo IClock registrado abajo (H-06): un Func<DateTimeOffset> suelto habria
// dejado el reloj sin contrato trazable en el SDD.
builder.Services.AddSingleton<Zentric.Domain.Users.Ports.IPasswordHasher, Zentric.Infrastructure.Security.Pbkdf2PasswordHasher>();
builder.Services.AddSingleton<Zentric.Domain.Users.Ports.IAuthTokenService>(sp =>
{
    var options = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<Zentric.Infrastructure.Security.JwtOptions>>();
    var clock = sp.GetRequiredService<Zentric.Domain.Common.Ports.IClock>();
    // Reloj inyectado para que la caducidad del token sea comprobable en pruebas
    // sin esperar una hora. ADR-0009.
    return new Zentric.Infrastructure.Security.JwtAuthTokenService(options, () => clock.UtcNow);
});

// H-06/R-06: el reloj del sistema se registra como IClock (singleton sin
// estado). Los adaptadores que toman decisiones con "ahora" (caducidad de
// tokens, barrido de carritos vencidos) consumen este puerto y NO
// DateTime.UtcNow directamente: asi la suite puede congelar el tiempo con un
// reloj falso. Ver backendSDD/Domain/services/checkout-timeout-service.md.
builder.Services.AddSingleton<Zentric.Domain.Common.Ports.IClock, Zentric.Infrastructure.Common.SystemClock>();

// Register DbContext
builder.Services.AddDbContext<ZentricDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"),
        b => b.MigrationsAssembly("Zentric.Infrastructure")));

// Register Repositories and UnitOfWork
builder.Services.AddScoped<Zentric.Application.Common.Ports.IUnitOfWork, Zentric.Infrastructure.Persistence.UnitOfWork>();
builder.Services.AddScoped<Zentric.Infrastructure.Persistence.IDomainEventDispatcher, Zentric.Infrastructure.Persistence.DomainEventDispatcher>();
builder.Services.AddScoped<Zentric.Domain.Users.Ports.IUserRepository, UserRepository>();
builder.Services.AddScoped<Zentric.Domain.Products.Ports.IProductRepository, ProductRepository>();
builder.Services.AddScoped<Zentric.Domain.Inventories.Ports.IInventoryRepository, InventoryRepository>();
builder.Services.AddScoped<Zentric.Domain.Warehouses.Ports.IWarehouseRepository, WarehouseRepository>();
builder.Services.AddScoped<Zentric.Domain.Orders.Ports.ICustomerOrderRepository, CustomerOrderRepository>();
builder.Services.AddScoped<Zentric.Domain.Logistics.Ports.IFulfillmentOrderRepository, FulfillmentOrderRepository>();
builder.Services.AddScoped<Zentric.Domain.Returns.Ports.IReturnRequestRepository, ReturnRequestRepository>();
builder.Services.AddScoped<Zentric.Domain.Billing.Ports.IInvoiceRepository, InvoiceRepository>();
builder.Services.AddScoped<Zentric.Domain.Payments.Ports.IPaymentReceiptRepository, PaymentReceiptRepository>();

// Register Background Services
builder.Services.AddHostedService<Zentric.Infrastructure.BackgroundServices.CheckoutTimeoutService>();

// Registro de la capa Application: dispatcher propio, validacion de entrada
// (FluentValidation) y handlers. Q-14: sustituye a AddMediatR.
builder.Services.AddZentricApplication();

// Comportamientos del pipeline de mensajes: la validacion se ejecuta antes del handler.
builder.Services.AddScoped(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

builder.Services.AddScoped<Zentric.Domain.Returns.Services.ReturnsApprovalService>();
builder.Services.AddScoped<Zentric.Domain.Inventories.Services.InventoryReservationService>();

// Q-08: pasarela de pago SIMULADA. El puerto vive en el Dominio; sustituir este
// adaptador por uno real (PSE, Wompi, Stripe) no exige tocar Dominio ni casos de uso.
builder.Services.AddScoped<Zentric.Domain.Payments.Ports.IPaymentGatewayService, Zentric.Infrastructure.Payments.SimulatedPaymentGateway>();


// CORS: habilita que el frontend (Vite, otro puerto) llame a la API. La lista de
// origenes viene de configuracion y NO se usa el comodin: un comodin con
// credenciales esta prohibido por el protocolo, y la API emite JWT desde ADR-0009,
// asi que los origenes deben quedar declarados de forma explicita.
var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Value;
var allowedOrigins = string.IsNullOrWhiteSpace(configuredOrigins)
    ? new[] { "http://localhost:5173" }
    : configuredOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
var app = builder.Build();

// Las migraciones se aplican al arrancar. Sin esto, `docker compose down -v` (documentado
// como "volumen de datos limpio") dejaba la base SIN TABLAS: el compose solo levanta
// PostgreSQL y la API, y ningun otro paso creaba el esquema. Se limita a Desarrollo
// porque en produccion aplicar el esquema al arrancar oculta el control de cambios.
//
// El Administrador inicial NO se crea aqui: lo hace el bloque de bootstrap de mas abajo,
// que ademas evita duplicarlo en cada reinicio.
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ZentricDbContext>();
    await db.Database.MigrateAsync();
}

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Zentric API v1");
    c.RoutePrefix = "swagger";
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("Frontend");

// Middleware global de excepciones: las fallas técnicas no controladas se convierten en Problem Details (AGENTS.md, sección 3.4).
app.UseExceptionHandler();

app.UseHttpsRedirection();

// La autenticacion debe ejecutarse ANTES de la autorizacion: es la que
// rellena HttpContext.User a partir del token. Sin este orden, la politica de
// reserva veria una peticion sin identidad y responderia 401 a todo.
app.UseAuthentication();
app.UseAuthorization();

// Sonda de salud para Docker, balanceadores y el healthcheck de compose.
// Verifica tambien la conectividad con PostgreSQL, no solo que el proceso exista.
app.MapGet("/health", async (Zentric.Infrastructure.Persistence.ZentricDbContext db) =>
{
    try
    {
        var canConnect = await db.Database.CanConnectAsync();
        return Results.Ok(new
        {
            status = canConnect ? "healthy" : "degraded",
            database = canConnect ? "up" : "down",
            timestamp = DateTimeOffset.UtcNow
        });
    }
    catch (Exception ex)
    {
        return Results.Json(
            new { status = "unhealthy", database = "down", error = ex.Message },
            statusCode: 503);
    }
})
.AllowAnonymous()
.WithName("Health");

// Alta del primer Administrador. Solo actua cuando NO existe ningun usuario con rol
// Administrador, de modo que un despliegue no duplica el administrador en cada reinicio.
// La implementacion vive en AdministratorBootstrapper porque las pruebas E2E la ejecutan
// de forma explicita: bajo WebApplicationFactory este evento no se dispara.
app.Lifetime.ApplicationStarted.Register(() =>
    Zentric.Api.Bootstrap.AdministratorBootstrapper.Run(app.Services, app.Configuration));

app.MapControllers();
app.Run();

// T-032: WebApplicationFactory solo puede reutilizar este arranque si la clase Program es
// visible desde fuera del ensamblado. No cambia el comportamiento: solo abre la puerta a las
// pruebas E2E HTTP, que levantan la API real contra un PostgreSQL efimero (Testcontainers).
public partial class Program { }
