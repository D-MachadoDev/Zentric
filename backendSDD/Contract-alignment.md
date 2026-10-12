# Politica contractual transversal

> Documento exigido por el prompt de orquestacion. Define la **precedencia entre documentos** y el
> contrato que deben respetar todas las fases. Ninguna fase puede reinterpretar firmas, nombres,
> codigos HTTP o puertos en contradiccion con este documento.

## Precedencia (de mayor a menor)

1. **Decision del Owner** ([`ZENTRIC.md`](../ZENTRIC.md)) - la Ley. Intocable.
2. **[`AGENTS.md`](../AGENTS.md)** - reglas operativas del repositorio.
3. **Este documento** - politica transversal de contrato.
4. **Las especificaciones de capa** - `Domain/`, `Application/`, `Infrastructure/`, `Presentation/`.
5. **Los ADR** - decisiones tecnicas ya tomadas.
6. **El codigo** - un resultado que cumple lo anterior, nunca una fuente.

Cuando dos documentos de un mismo nivel se contradicen, gana el mas reciente **y se corrige el
anterior**. Un documento que contradice a otro mas nuevo no es un problema de criterio: es deuda.

## Reglas transversales

### Identidad
1. La identidad viaja **solo** en `Authorization: Bearer`. Ninguna cabecera propia.
2. El identificador del llamante sale del claim `sub`. Un identificador en el cuerpo **se descarta**.
3. Sin token: `401`. Con token sin permiso: `403`, sin cuerpo.

### Propiedad del recurso
4. Un recurso ajeno responde **igual que uno inexistente**: mismo codigo y mismo mensaje.
5. La propiedad se comprueba **en la consulta**, nunca despues de traer el dato y descartarlo.
6. El filtro lo decide **el rol**, no un parametro de la peticion. No existe `?sellerId=` ni
   `?buyerId=` porque no debe poder pedirse lo ajeno.

### Formato
7. Los errores van en `application/problem+json`. Ver
   [`Adapters/Global-exception-handler.md`](Adapters/Global-exception-handler.md).
8. Los `enum` viajan **solo por nombre**. Un entero es `400`.
9. La respuesta de exito es `application/json`.

### Puertos
10. Un puerto publicado en el host y el puerto del contenedor se declaran **una sola vez** y se
    referencian. No se acepta una combinacion incoherente sin decision documentada.
11. Entre contenedores se usan **nombres de servicio**, nunca `localhost`.

## Matriz de trazabilidad

Cada requisito debe mapear a un archivo, una validacion y un estado. Lo que no tiene prueba queda
`PARTIAL`, nunca `VERIFIED`.

| Requisito | Documento | Implementacion | Validacion | Estado |
|---|---|---|---|---|
| Modelo e invariantes | [`Domain/`](Domain/) | `Zentric.Domain/` | suite de dominio | `VERIFIED` |
| Casos de uso y puertos de entrada | [`Application/`](Application/) | `Zentric.Application/` | pruebas de handlers | `VERIFIED` |
| Persistencia y despliegue | [`Infrastructure/`](Infrastructure/) | `Zentric.Infrastructure/` | E2E contra PostgreSQL efimero | `VERIFIED` |
| Contrato HTTP | [`Presentation/01-endpoints.md`](Presentation/01-endpoints.md) | `Zentric.Api/Controllers/` | E2E por HTTP | `VERIFIED` |
| Autorizacion por rol | [`Presentation/02-authorization.md`](Presentation/02-authorization.md) | `Zentric.Api/Security/` | matriz por reflexion + HTTP | `VERIFIED` |
| Validacion de entrada | [`Adapters/Rest-validation.md`](Adapters/Rest-validation.md) | validadores de `Zentric.Application/` | pruebas de validadores | `VERIFIED` |
| Errores | [`Adapters/Global-exception-handler.md`](Adapters/Global-exception-handler.md) | `Zentric.Api/Contracts/` | pruebas de codigos | `VERIFIED` |
| CORS y token | [`Backend-Cors-Security.md`](Backend-Cors-Security.md) | `Zentric.Api/Program.cs` | pruebas HTTP | `VERIFIED` |
| Reportes administrativos | - | - | - | **`NOT_STARTED`** (brecha `R-08`, requiere dictamen) |

## Que queda fuera

- **Tecnologia.** Nada de este documento impone .NET, EF Core ni PostgreSQL. El sistema puede
  construirse con otro stack y cumplir lo mismo.
- **Secretos.** Ningun secreto real en el repositorio; van en variables de entorno.
