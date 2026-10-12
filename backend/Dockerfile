# Contexto de build: la raiz del repositorio (compose usa context: . y dockerfile: backend/Dockerfile)
# Los .csproj viven bajo backend/, por eso se copian con ese prefijo.

# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copiar primero solo los manifiestos para aprovechar la cache de restore
COPY ["backend/Zentric.Domain/Zentric.Domain.csproj", "backend/Zentric.Domain/"]
COPY ["backend/Zentric.Application/Zentric.Application.csproj", "backend/Zentric.Application/"]
COPY ["backend/Zentric.Infrastructure/Zentric.Infrastructure.csproj", "backend/Zentric.Infrastructure/"]
COPY ["backend/Zentric.Api/Zentric.Api.csproj", "backend/Zentric.Api/"]
COPY ["backend/Zentric.Tests/Zentric.Tests.csproj", "backend/Zentric.Tests/"]
COPY ["backend/Zentric.slnx", "backend/"]

RUN dotnet restore "backend/Zentric.slnx"

# Codigo fuente
COPY backend/ backend/
WORKDIR "/src/backend/Zentric.Api"
RUN dotnet publish "Zentric.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
# curl solo para el healthcheck de compose: sondea /health sin ejecutar el
# host de .NET una segunda vez (la orden anterior, `dotnet ... --health`,
# arrancaba otra copia de la API en el mismo puerto y fallaba con
# "address already in use", dejando el contenedor como `unhealthy` para siempre).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
# Usuario no root (imagen oficial de .NET 10 en Linux)
USER app
ENTRYPOINT ["dotnet", "Zentric.Api.dll"]
