# Capa de Infraestructura — Contenedores y Despliegue (Docker)

> **Documento canónico SDD** para la definición técnica de empaquetado y orquestación de contenedores del proyecto `zentric`.

---

## 1. Justificación y Propósito: ¿Por qué existen dos archivos Docker?

En el proyecto existen intencionalmente dos archivos con responsabilidades complementarias y no redundantes:

```mermaid
graph TD
    subgraph Orquestación ["docker-compose.yml (Entorno Completo)"]
        compose[docker-compose.yml]
        compose -->|Levanta BD| pg[(zentric-postgres: PostgreSQL 16)]
        compose -->|Construye y Conecta| api[zentric-api: ASP.NET Core 10]
        compose -->|Persistencia| vol[(Volumen: zentric_pgdata)]
        compose -->|Red Interna| net[Red Docker bridge]
    end

    subgraph Empaquetado ["Dockerfile (Imagen de la Aplicación)"]
        dockerfile[Dockerfile] -->|Compilación Multi-Stage| build[SDK 10.0 Build]
        build -->|Publicación Binaria| runtime[ASP.NET 10.0 Runtime]
        runtime -->|Produce| img[Imagen: zentric:latest]
    end

    api -.->|Usa la receta de| dockerfile
```

### 1.1 `Dockerfile` (Receta de Construcción de Imagen)
- **Responsabilidad Única:** Empaquetar el código fuente de C# .NET 10 en una imagen Docker autocontenida y ligera (`zentric:latest`).
- **Patrón:** *Multi-stage build* (Construcción en dos etapas):
  1. **Stage 1 (`build`):** Utiliza `mcr.microsoft.com/dotnet/sdk:10.0` para restaurar paquetes NuGet (`dotnet restore Zentric.slnx`), compilar y publicar en modo Release (`/app/publish`).
  2. **Stage 2 (`final`):** Utiliza la imagen base de ejecución mínima `mcr.microsoft.com/dotnet/aspnet:10.0`, copiando únicamente los binarios compilados y exponiendo el puerto `8080`.
- **Aislamiento:** El `Dockerfile` no conoce detalles de bases de datos externas, cadenas de conexión productivas ni servicios vecinos. Solo sabe cómo compilar y ejecutar la API.

### 1.2 `docker-compose.yml` (Orquestador Multi-Contenedor)
- **Responsabilidad Única:** Definir la topología de servicios, redes, volúmenes y variables de entorno para levantar el entorno de desarrollo y pruebas de integración con un único comando: `docker compose up -d`.
- **Servicios Declarados:**
  1. **`db` (`zentric-postgres`):**
     - Imagen: `postgres:16-alpine`.
     - Puerto expuesto al host: `5432:5432`.
     - Volumen persistente: `zentric_pgdata` mapeado a `/var/lib/postgresql/data`.
     - Credenciales: `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`, `POSTGRES_DB=ZentricDb`.
  2. **`api` (`zentric-api`):**
     - Construcción: Hace referencia al `Dockerfile` en la raíz (`context: .`, `dockerfile: Dockerfile`).
     - Dependencia: `depends_on: [ db ]`.
     - Mapeo de puertos: `5076:8080` (el puerto 5076 del host se conecta al 8080 del contenedor).
     - Configuración de entorno:
       - `ASPNETCORE_ENVIRONMENT=Development`
       - `ConnectionStrings__DefaultConnection=Host=db;Port=5432;Database=ZentricDb;Username=postgres;Password=postgres`

---

## 2. Alineación con las Biblias del Proyecto

1. **`ZENTRIC.md`, sección 3.2 (Exclusiones de la Ley):**
   - La Ley declara textualmente: *"Se excluyen del alcance: tecnologías de implementación, arquitectura del software y almacenamiento de la información."*
   - Por ende, la elección de Docker, Compose, PostgreSQL y .NET 10 pertenece a la capa de Infraestructura técnica y se rige por esta especificación SDD.
2. **`AGENTS.md`, sección 2.1 (Regla de Dependencia Estricta):**
   - Ni `Zentric.Domain` ni `Zentric.Application` tienen conocimiento alguno de Docker o PostgreSQL.
   - El empaquetado solo afecta el Composition Root (`Zentric.Api`) y la Infraestructura.

---

## 3. Comandos de Verificación Operativa

```bash
# Construir imagen individual de la API
docker build -t zentric:latest .

# Levantar entorno completo (PostgreSQL + API)
docker compose up -d

# Ver logs en tiempo real
docker compose logs -f api

# Apagar y preservar datos de la base de datos
docker compose down

# Apagar y reiniciar volumen de datos limpio
docker compose down -v
```

### 2.1 El esquema se crea solo (verificado 2026-09-30)

`docker compose down -v` borra el volumen entero: **no solo los datos, también las tablas.** Antes de
que la API aplicara las migraciones al arrancar, el comando prometía un "volumen de datos limpio"
y en realidad dejaba una base **sin ninguna tabla**, porque el compose solo levanta PostgreSQL y
ningún otro paso creaba el esquema. Quien lo ejecutara después tendría que acordarse de correr
`dotnet ef database update` a mano.

Ahora `Program.cs` aplica las migraciones al arrancar, **solo en `Development`**, justo después de
`builder.Build()` y antes de registrar los endpoints:

```csharp
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ZentricDbContext>();
    await db.Database.MigrateAsync();
}
```

Se limita a Desarrollo a propósito: en producción, aplicar el esquema al arrancar escondería el
control de cambios detrás de un despliegue. El Administrador inicial **no** se crea aquí, sino en
el bloque de bootstrap de `Program.cs`, que además evita duplicarlo en cada reinicio.

**Verificado sobre una base creada desde cero** (`down -v` y `up -d db` y `up -d api`): **15
tablas** creadas, **7 migraciones** aplicadas en `__EFMigrationsHistory` y un único usuario, el
`admin@zentric.local` del bootstrap. El smoke de autorización corrió después sobre esa base limpia
con **69/69 comprobaciones y 0 fallos**.

> **Trampa al refrescar en local:** `docker compose up -d --force-recreate` **no** actualiza el
> código, porque reutiliza la imagen ya construida. La API corre desde `/app` (no de
> `/app/publish`, que es el directorio intermedio del `Dockerfile`). Para probar cambios sin
> reconstruir la imagen:
> `dotnet publish backend/Zentric.Api -c Release -o <dir>` y después
> `docker cp <dir>/. zentric-api:/app` + `docker restart zentric-api`.

