// Punto de entrada y composition root de la API web (arquitectura hexagonal).
// Ensambla el pipeline HTTP y registra dependencias entre Application e Infrastructure.
// Mantiene el nombre de ensamblado Zentric.Api requerido por la solucion y los scripts de CI.


using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
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

// Serializacion de enums por nombre estricto; valores numericos son rechazados con 400.
// El manejo global de errores en este punto asegura consistencia con los controladores de presentacion.
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

    // Esquema Bearer JWT para Swagger UI.
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

// Mapeo de errores a RFC 7807 (Problem Details).
builder.Services.AddProblemDetails();

// Autenticacion JWT. La identidad proviene exclusivamente del token verificado; no se admiten cabeceras manuales.
// JwtOptions.Validate() falla en el arranque si falta la clave de firma.
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
    // Politica fallback: exige token por defecto en todos los endpoints salvo excepciones explicitas con [AllowAnonymous].
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    // Registro dinamico de politicas por rol a partir de la matriz de AuthorizationPolicies.
    // Ningun acceso queda autorizado por defecto sin validar politicas.
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

// Puerto de credenciales y emision de token desacoplado del dominio y los casos de uso.
builder.Services.AddSingleton<Zentric.Domain.Users.Ports.IPasswordHasher, Zentric.Infrastructure.Security.Pbkdf2PasswordHasher>();
builder.Services.AddSingleton<Zentric.Domain.Users.Ports.IAuthTokenService>(sp =>
{
    var options = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<Zentric.Infrastructure.Security.JwtOptions>>();
    var clock = sp.GetRequiredService<Zentric.Domain.Common.Ports.IClock>();
    // IClock inyectado para desacoplar el tiempo del sistema y permitir su control en pruebas.
    return new Zentric.Infrastructure.Security.JwtAuthTokenService(options, () => clock.UtcNow);
});

// IClock singleton consumido por adaptadores que evaluan caducidades o barrido temporal.
builder.Services.AddSingleton<Zentric.Domain.Common.Ports.IClock, Zentric.Infrastructure.Common.SystemClock>();

builder.Services.AddDbContext<ZentricDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"),
        b => b.MigrationsAssembly("Zentric.Infrastructure")));

builder.Services.AddHealthChecks()
    .AddDbContextCheck<ZentricDbContext>(name: "database", tags: new[] { "ready" });

builder.Services.AddScoped<Zentric.Application.Common.Ports.IUnitOfWork, Zentric.Infrastructure.Persistence.UnitOfWork>();
builder.Services.AddScoped<Zentric.Infrastructure.Persistence.IDomainEventDispatcher, Zentric.Infrastructure.Persistence.DomainEventDispatcher>();
builder.Services.AddScoped<Zentric.Domain.Users.Ports.IUserRepository, UserRepository>();
builder.Services.AddScoped<Zentric.Domain.Buyers.Ports.IBuyerRepository, BuyerRepository>();
builder.Services.AddScoped<Zentric.Domain.Products.Ports.IProductRepository, ProductRepository>();
builder.Services.AddScoped<Zentric.Domain.Products.Ports.IUserRecentlyViewedRepository, UserRecentlyViewedRepository>();
builder.Services.AddScoped<Zentric.Domain.Inventories.Ports.IInventoryRepository, InventoryRepository>();
builder.Services.AddScoped<Zentric.Domain.Warehouses.Ports.IWarehouseRepository, WarehouseRepository>();
builder.Services.AddScoped<Zentric.Domain.Orders.Ports.ICustomerOrderRepository, CustomerOrderRepository>();
builder.Services.AddScoped<Zentric.Domain.Logistics.Ports.IFulfillmentOrderRepository, FulfillmentOrderRepository>();
builder.Services.AddScoped<Zentric.Domain.Returns.Ports.IReturnRequestRepository, ReturnRequestRepository>();
builder.Services.AddScoped<Zentric.Domain.Billing.Ports.IInvoiceRepository, InvoiceRepository>();
builder.Services.AddScoped<Zentric.Domain.Payments.Ports.IPaymentReceiptRepository, PaymentReceiptRepository>();
builder.Services.AddScoped<Zentric.Domain.Returns.Ports.IRefundAuditRepository, RefundAuditRepository>();

builder.Services.AddHostedService<Zentric.Infrastructure.BackgroundServices.CheckoutTimeoutService>();
builder.Services.AddHostedService<Zentric.Infrastructure.BackgroundServices.OutboxProcessor>();

// Registro de Application: dispatcher propio, validaciones con FluentValidation y handlers.
builder.Services.AddZentricApplication();

// Pipeline de mensajes: validacion previa a la ejecucion del handler.
builder.Services.AddScoped(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

builder.Services.AddScoped<Zentric.Domain.Returns.Services.ReturnsApprovalService>();
builder.Services.AddScoped<Zentric.Domain.Inventories.Services.InventoryReservationService>();
builder.Services.AddScoped<Zentric.Domain.Orders.Services.OrderFulfillmentProgressSynchronizer>();
builder.Services.AddScoped<Zentric.Domain.Returns.Services.RefundPolicyService>();

// Pasarela de pago simulada. El puerto vive en Dominio; Payments:Provider define el proveedor activo.
var paymentsProvider = builder.Configuration.GetSection(
    Zentric.Infrastructure.Payments.PaymentGatewayOptions.SectionName)
    .Get<Zentric.Infrastructure.Payments.PaymentGatewayOptions>()?.Provider ?? "simulated";
if (!string.Equals(paymentsProvider, "simulated", StringComparison.OrdinalIgnoreCase))
{
    throw new InvalidOperationException(
        $"Payments:Provider '{paymentsProvider}' sin adaptador real. El Owner debe dictar el proveedor y su adaptador (Freno de Mano).");
}
builder.Services.AddScoped<Zentric.Domain.Payments.Ports.IPaymentGatewayService, Zentric.Infrastructure.Payments.SimulatedPaymentGateway>();


// Politica de CORS restringida a los origenes configurados sin comodines para admitir credenciales.
var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Value;
var allowedOrigins = string.IsNullOrWhiteSpace(configuredOrigins)
    ? new[] { "http://localhost:15434", "http://localhost:15435" }
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

// Migraciones automaticas en desarrollo para asegurar esquema inicial en contenedores efimeros.
// El Administrador inicial se crea en el bloque de bootstrap posterior.
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ZentricDbContext>();
    await db.Database.MigrateAsync();
}

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

// Cabeceras de seguridad HTTP: proteccion contra sniffing, frames y referer.
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    await next();
});

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

// Middleware global de excepciones: las fallas técnicas no controladas se convierten en Problem Details.
app.UseExceptionHandler();

app.UseHttpsRedirection();

// Autenticacion ejecutada antes de autorizacion para poblar HttpContext.User antes de evaluar politicas.
app.UseAuthentication();
app.UseAuthorization();

// Cache de respuesta para idempotencia en peticiones duplicadas.
app.UseMiddleware<Zentric.Api.Security.IdempotencyMiddleware>();

// Endpoints de salud publicos para sondas de liveness (/health) y readiness (/ready).
app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false, // solo liveness: no verifica dependencias
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new
        {
            status = "healthy",
            timestamp = DateTimeOffset.UtcNow
        }));
    }
})
.AllowAnonymous()
.WithName("Health");

app.MapHealthChecks("/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"), // verifica DB
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var status = report.Status == Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Healthy ? "healthy" : "unhealthy";
        await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new
        {
            status,
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description
            }),
            timestamp = DateTimeOffset.UtcNow
        }));
    }
})
.AllowAnonymous()
.WithName("Ready");

// Inicializacion del primer Administrador cuando no existen usuarios con dicho rol.
app.Lifetime.ApplicationStarted.Register(() =>
    Zentric.Api.Bootstrap.AdministratorBootstrapper.Run(app.Services, app.Configuration));

app.MapControllers();
app.Run();

// Visibilidad publica de Program para pruebas de integracion con WebApplicationFactory.
public partial class Program { }
