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

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
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
builder.Services.AddScoped<Zentric.Domain.Payments.Ports.IPaymentGateway, Zentric.Infrastructure.Payments.SimulatedPaymentGateway>();

var app = builder.Build();

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

// Middleware global de excepciones: las fallas técnicas no controladas se convierten en Problem Details (AGENTS.md, sección 3.4).
app.UseExceptionHandler();

app.UseHttpsRedirection();
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

app.MapControllers();
app.Run();
