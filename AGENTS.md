# AGENTS.md — Directrices y Contexto para Agentes de IA

> Este archivo define las reglas, arquitectura, roles y convenciones que cualquier agente de IA (Antigravity, Cursor, Claude, Copilot) debe seguir estrictamente al trabajar en el repositorio **zentric**.
---

## 0. ENRUTADOR Y PRINCIPIOS DE SPEC-DRIVEN DEVELOPMENT (SDD)

En este proyecto aplicamos **Spec-Driven Development (SDD)**. La documentación en la carpeta `/SDD` es la **Fuente Única de Verdad (Single Source of Truth - SSoT)**.

### 0.0 Skill de ingeniería SDD (obligatoria)
*   La metodología operativa de todo agente en este repositorio vive en la **skill `generic-sdd-agent` v7.0.1** (documento único):
    - Fuente de verdad versionada: [`.agents/skills/generic-sdd-agent/SKILL.md`](.agents/skills/generic-sdd-agent/SKILL.md) (v7.0.1, monolítico; **ya no usa `references/`**).
    - Copia instalada automática: `%USERPROFILE%\.agents\skills\generic-sdd-agent\` (regenerar con `.agents/skills/generic-sdd-agent/scripts/sync-skill.ps1`; **no editar la copia a mano**).
    - Overlay del repositorio: integrado en **este [AGENTS.md](AGENTS.md)** ([sección 0](AGENTS.md#0-enrutador-y-principios-de-spec-driven-development-sdd)–[sección 8](AGENTS.md#8-checklist-de-definicion-de-terminado-dod-para-agentes)) más el contexto persistente de [backendSDD/SDD.md](backendSDD/SDD.md).
*   **Contexto persistente (huella mínima):** [AGENTS.md](AGENTS.md) (contrato operativo) + [backendSDD/SDD.md](backendSDD/SDD.md) (memoria viva: mapa de entidades, decisiones/ADDENDA, verificación, riesgos y estado). [backendSDD/SDD.md](backendSDD/SDD.md) **no duplica** las specs: las indexa y apunta a ellas.
*   Cuando exista conflicto, la prioridad es: decisión del Owner → [AGENTS.md](AGENTS.md) → [ZENTRIC.md](ZENTRIC.md) (Ley) → resto de backendSDD/ → skill.
*   `generic-sdd-agent.md` (raíz, v2.0.0) quedó **superseded** y fue **ELIMINADO el 2026-09-18** por autorización del Owner (el propio archivo pedía autorización para su eliminación). La skill **v7.0.1** es el único punto de entrada metodológico vigente.

### 0.1 Consulta Obligatoria Antes de Codificar
Antes de generar o modificar código, el agente **DEBE** consultar la documentación correspondiente en `/SDD`:

*   **Para contexto del negocio global:** Lee [backendSDD/01-system-overview.md](backendSDD/01-system-overview.md).
*   **Para entender el flujo general y las capas:** Lee [backendSDD/02-software-architecture.md](backendSDD/02-software-architecture.md) para asimilar la Arquitectura Hexagonal y la regla de dependencia.
*   **Para el contexto de negocio específico y reglas puras (Bounded Context):** Revisa los archivos dentro de backendSDD/Domain/. Aquí habitan las invariantes, el modelado y las reglas de negocio.
*   **Para orquestación, puertos de salida y casos de uso:** Revisa los archivos en backendSDD/Application/.
*   **Para acceso a datos, ORM y adaptadores:** Revisa los archivos en backendSDD/Infrastructure/.
*   **Para controladores y exposición de endpoints:** Revisa los archivos en backendSDD/Presentation/.

### 0.2 Regla de Sincronización Bidireccional (Spec-Anchored Code)
*   **Sin Especificación no hay Código:** Todo cambio estructural o de regla de negocio debe estar respaldado por la especificación en `/backendSDD/`.
*   **Actualización de Specs:** Si durante la implementación surge un ajuste de modelo o regla de negocio, el agente **DEBE actualizar simultáneamente** el documento de especificación correspondiente en `/backendSDD/` para mantener el código y la especificación 100% sincronizados.

### 0.3 El Freno de Mano (Cero Asunciones)
*   Si el usuario solicita implementar una funcionalidad que **no existe** en la especificación, o si la especificación es **ambigua**, el agente **tiene prohibido inventar o asumir**.
*   El agente debe **detenerse**, informar al usuario sobre la ambigüedad o falta de especificación, y proponer redactar o aclarar la especificación en `/backendSDD/` antes de generar una sola línea de código.

### 0.4 Lenguaje Ubicuo Estricto (Cero Sinónimos)
*   El agente tiene prohibido inventar sinónimos al traducir la especificación a código. Las variables, clases, métodos, interfaces y entidades de base de datos **DEBEN usar exactamente los mismos términos** definidos en el Glosario y en los modelos de `/backendSDD/` (por ejemplo, si la spec dice `Buyer`, nunca usar `Customer` o `Client`).

### 0.5 Trazabilidad y Progreso
*   El agente debe registrar el progreso (por ejemplo, marcando con checkboxes [x]) de las tareas implementadas dentro de los documentos aplicables en /backendSDD/, o en un archivo de seguimiento dedicado (TRACKING.md / TODO.md), para que siempre exista trazabilidad clara entre la especificacion y el codigo implementado.

### 0.6 Autonomia de Flujo (No Interrumpir Innecesariamente)
*   Si el agente finaliza y verifica (tests 100% en verde) una capa completa (ej. Dominio), **DEBE avanzar automaticamente** a la siguiente capa arquitectonica (ej. Aplicacion -> Infraestructura) segun el patron Hexagonal, sin detenerse a preguntar "¿que quieres hacer ahora?", limitandose a informar al usuario de los hitos logrados.

### 0.7 Inmutabilidad de los Documentos "Biblia" y Registro de Cambios
*   Los documentos entregados directamente por el cliente o definidos como la "Ley" (ej. ZENTRIC.md) son **INTOCABLES** por el agente en cuanto a su redaccion inventada.
*   Si existen vacios en la "Ley", el agente aplicara el "Freno de Mano" y obligatoriamente **pedira al Owner que dicte las reglas exactas**.
*   **Marcado de Trazabilidad:** Si el Owner aprueba o dicta modificaciones sobre la especificacion original, el agente debe registrar y marcar explicitamente que adiciones se le hicieron a la "Biblia" (ej. agregando [ADDENDUM - DICTADO POR OWNER]), para mantener total claridad entre el documento original del cliente y la expansion del modelo.

---

## 1. Visión General del Proyecto

- **Nombre del Proyecto:** zentric
- **Propósito:** API Central y Core de Dominio para Zentric (gestión de marketplace, inventarios, compradores, bodegas, productos, catálogos, vendedores y pedidos).
- **Stack Tecnológico Principal:**
  - Lenguaje: C# (.NET 10)
  - Patrón Arquitectónico: Arquitectura Hexagonal (Puertos y Adaptadores) + Domain-Driven Design (DDD)
  - Base de Datos: PostgreSQL 
  - ORM / Persistencia: EF Core
  - Testing: xUnit
- **Principios de Diseño:**
  - Spec-Driven Development (SDD)
  - Domain-Driven Design (DDD)
  - Arquitectura Hexagonal (Ports & Adapters)
  - Patrones de diseño: CQRS, Mediator, Repository, Unit of Work, Result Pattern
  - Principios SOLID y Clean Code
  - Codigo en inglés, comentarios en español (para el equipo de desarrollo hispanohablante)


---

## 2. Reglas Arquitectónicas Inviolables (Hexagonal + DDD)

Cualquier agente que genere o modifique código en este proyecto DEBE cumplir con los siguientes límites arquitectónicos:

### 2.1. Regla de Dependencia Estricta y Aislamiento de Capas
El flujo de dependencias es unidireccional y siempre apunta hacia el centro (Dominio). 

- **Zentric.Domain** (El Centro): No referencia a ningún otro proyecto de la solución. Es el núcleo puro del negocio.
  - **PROHIBIDO:** Instalar paquetes o tener dependencias de infraestructura, ORMs (EF Core), frameworks web (ASP.NET Core) o clientes HTTP.
  - **Uso:** Exclusivo para código C# puro (Entidades, Value Objects, Agregados, Domain Events y Domain Services).

- **Zentric.Application** (Orquestación): Referencia **SOLO** a Zentric.Domain.
  - **PROHIBIDO:** Referenciar a Zentric.Infrastructure o Zentric.Api. 
  - **Uso:** No debe contener SQL, ni detalles de HTTP, ni dependencias de Entity Framework.

- **Zentric.Infrastructure** (Tecnología): Referencia a Zentric.Application (para implementar sus puertos) y a Zentric.Domain (para mapear datos).
  - **PROHIBIDO:** Referenciar a Zentric.Api.
  - **Uso:** Implementación técnica (EF Core, PostgreSQL, APIs de terceros).

- **Zentric.Api** (Presentation / Composition Root): Referencia a Zentric.Application y a Zentric.Infrastructure.
  - **Uso restrictivo:** La referencia a Infrastructure es **ÚNICAMENTE** para registrar la Inyección de Dependencias (IoC) en el archivo de inicio (Program.cs). Los controladores web solo deben hablar con Application.

### 2.2. Puertos y Adaptadores
- **Puertos de Salida (Output Ports):** Interfaces definidas en la capa Application o Domain. Dictan QUÉ necesita el sistema (abstracción), sin importar CÓMO se obtiene.
- **Adaptadores de Salida:** Clases concretas que implementan los puertos de salida en Infrastructure.
- **Puertos de Entrada (Input Ports):** Interfaces o Casos de Uso definidos e implementados en Application.
- **Adaptadores de Entrada:** Controladores REST (Endpoints) en Presentation que reciben solicitudes HTTP y delegan inmediatamente la ejecución a los puertos de entrada.

### 2.3. Modelado de Dominio (Táctico)
- **Entidades y Raíces de Agregado:** Tienen identidad única (ID) y controlan su ciclo de vida.
  - **Regla de mutación:** **PROHIBIDO** el uso de setters públicos anémicos. El estado interno solo puede modificarse mediante métodos de negocio expresivos que validen las invariantes antes de aplicar el cambio.
- **Value Objects:** Conceptos del dominio sin identidad propia.
  - **Regla:** Deben ser estrictamente inmutables.


### 2.4. Auditoria de Mapeo Completo (Anti-Amnesia de Entidades)
*   **Problema a evitar:** Es una falla critica en proyectos empresariales olvidar entidades en la persistencia por concentrarse solo en los requerimientos nuevos.
*   **Mandato:** Al construir o inicializar la capa de Infraestructura (ej. DbContext, Repositorios, Migraciones), el agente tiene **PROHIBIDO** basarse unicamente en el contexto de la conversacion reciente. Debe escanear **OBLIGATORIAMENTE** el proyecto Zentric.Domain completo (o backendSDD/Domain) para garantizar que el **100% de los Agregados Raiz** del sistema sean integrados (ej. DbSets).



## 3. Tratamiento de Errores y Excepciones (Organizado por Capa)

  ### **Regla Global del Proyecto:**
  *   **Patrón Result:** Utilizar el patrón Result<T> en las capas de Aplicación e Infraestructura para manejar resultados de operaciones que pueden fallar y reflejar reglas de negocio predecibles.
  *   **Control de Flujo:** Prohibido utilizar excepciones para controlar el flujo lógico habitual del sistema.

  ### 1. Capa de Dominio (Domain Layer)
  *   **Invariantes y Guardas:** Las entidades pueden usar guardas defensivas (ArgumentException, InvalidOperationException) o retornar Result para garantizar que nunca existan objetos en un estado inválido en memoria.
  *   **Cero Captura Técnica:** Prohibido usar bloques try-catch o dependencias de excepciones técnicas de infraestructura en el dominio.

  ### 2. Capa de Aplicación (Casos de Uso)
  *   **Validación de Entrada:** Los errores de validación de entrada (formatos, nulos, longitudes) deben ser manejados obligatoriamente en esta capa (usando FluentValidation / Result) antes de invocar a las entidades del dominio.
  *   **Retorno de Resultados:** Devolver objetos Result<T> a la capa de presentación para representar fallos predecibles de negocio.
  *   **Paso Transparente de Excepciones Catastróficas:** Excepciones no controladas de infraestructura (fallos de red, caídas de base de datos) NUNCA deben ser atrapadas con try-catch genéricos aquí; dejar que suban al middleware.

  ### 3. Capa de Infraestructura (Infrastructure Layer)
  *   **Traducción de Errores:** Los errores predecibles de infraestructura deben ser atrapados en esta misma capa y traducidos a un error de negocio o Result.Failure.
  *   **Ocultamiento de Detalles:** Prohibido exponer detalles internos de la tecnología (SqlException, cadenas de conexión) hacia la capa de Aplicación.

  ### 4. Capa de Presentación / Adaptador Primario (API, Controladores)
  *   **Middleware de Excepciones Global:** Esta capa es la última barrera. Implementa un manejador global (Exception Middleware) que atrape cualquier excepción técnica o catastrófica no controlada.
  *   **Mapeo de Respuestas:** Mapea los objetos Result<T> a respuestas HTTP RESTful consistentes (usando RFC 7807 Problem Details).

---

## 4. Roles de Agentes Especializados

Cuando interactúes en este proyecto, asume o coordina según el rol requerido:

### 4.1 Domain-Architect-Agent
- **Responsabilidad:** Modelado de entidades, agregados, servicios, value objects, invariantes de negocio y **mantenimiento de las especificaciones en `/backendSDD/Domain/`**.
- **Criterio:** Garantizar que el modelo refleje fielmente el lenguaje ubicuo y no se contamine con detalles técnicos.

### 4.2 `Infrastructure-Adapter-Agent`
- **Responsabilidad:** Implementación de repositorios, mapeadores (Mappers DTO <-> Entidad), migraciones de BD (PostgreSQL) y clientes HTTP externos.
- **Criterio:** Asegurar rendimiento de consultas, transaccionalidad, manejo de concurrencia y **aislamiento estricto de las entidades EF Core respecto a Application/Domain**.

### 4.3 `Application-API-Agent`
- **Responsabilidad:** Casos de uso / Handlers (CQRS), controladores REST, validaciones de entrada (FluentValidation) y DTOs de Request/Response, puertos de entrada y salida.
- **Criterio:** Mantener controladores delgados (thin controllers) y asegurar respuestas RESTful basadas en Problem Details (RFC 7807).

### 4.4 `QA-Testing-Agent`
- **Responsabilidad:** Tests unitarios de dominio y aplicación (100% de cobertura en reglas de negocio críticas) inyectando adaptadores falsos (Mocks).
- **Criterio (Tests = Documentación Viva):** En alineación con BDD (Behavior Driven Development), los tests deben mapearse directamente a los casos de uso definidos en `/backendSDD/Application/`. Los nombres de los tests deben leerse como los criterios de aceptación de la especificación.
- **Criterio Técnico:** Nombrado claro de tests (patrón `Metodo_Condicion_ResultadoEsperado`).

---

## 5. Convenciones de Código y Estilo en C#

- **Nombres:**
  - Interfaces: Prefijo I.
  - Clases / Métodos / Propiedades: PascalCase.
  - Variables locales / Parámetros: camelCase.
  - Campos privados: _camelCase.
- **Inmutabilidad:**
  - Priorizar record o clases con propiedades init / private set en Value Objects y DTOs.
  - Priorizar `sealed` en clases de dominio que no deban ser heredadas.
  - **Evitar setters públicos:** Las entidades y agregados deben exponer métodos de negocio explícitos que modifiquen su estado, prohibido usar setters públicos anémicos.
- **Documentación:** ver [sección 5.1](#51-reglas-de-comentado-del-código).

### 5.1 Reglas de comentado del código

**Idioma:** código en inglés, comentarios en español. Un comentario que explique una decisión del dominio **debe** citar la regla y su origen (`ZENTRIC.md`, ADR, invariante). Un comentario que repita el código sobra.

**Qué SÍ lleva comentario:**

| Elemento | Motivo |
|---|---|
| Invariante o regla de negocio | Es lo único que el compilador no puede expresar |
| Por qué se eligió esta solución | Para que nadie la "simplifique" sin saber qué rompe |
| Workaround o deuda técnica conocida | Para que no se lea como error |
| Decisión del Owner que difiere de la Ley | `[ADDENDUM]` o referencia al ADR |
| Par magical | `DefaultPercentage = 0.05m` sin contexto es un bug esperando |

**Qué NO lleva comentario:**

| Prohibido | Ejemplo de lo que hay que borrar |
|---|---|
| Traducir la firma | `// Devuelve el total` sobre `Money TotalAmount` |
| Marcar secciones obvias | `// Constructor`, `// Método público` |
| Comentario muerto | Describir un `if` que ya no existe |
| Describir el *qué* en vez del *por qué* | `// Itera sobre items` antes de un `foreach` |
| Justificativo sin decisión | "Porrequirement del cliente" sin citar la regla |

**Casos límite:**

- **Complejidad inevitable** (algoritmo de fraccionamiento, split de comisión): comentario que explique el algoritmo y su invariante, con referencia al ADR.
- **Código de la Ley:** cada traducción de la Ley al código debe citar la sección: `// ZENTRIC.md Dominio 6: no se permiten existencias negativas.`

**Formato:**

- Comentarios de una línea: `// texto` con espacio después de `//`.
- Comentarios de bloque: usar `//` alineado, nunca `/* ... */` salvo XML doc.
- Documentación pública: XML `///` con `<summary>` y `<param>`. En el Dominio, además `<remarks>` cuando la regla viene de la Ley.
- **Nada de TODO sin dueño ni contexto.** Un `TODO` sin issue o sin nombre es ruido.

**Vencimiento:** un `// TODO` o `// FIXME` con más de 30 días se escala a pregunta abierta en `backendSDD/SDD.md` o se borra. Si nadie lo reclama en 30 días, no era importante.

---

## 6. Inyección de Dependencias (DI)
  - Cada capa (Application, Infrastructure) debe tener su propio método de extensión de registro.
  - El proyecto de Presentación (Api) es el Composition Root y el único autorizado para ensamblar e inyectar todas las capas.

---

## 7. Comandos de Verificación y Compilación

Antes de dar por terminada una tarea, el agente debe verificar:

```bash
# Compilar solución
cd backend; dotnet build Zentric.slnx

# Ejecutar tests
cd backend; dotnet test

# Restaurar paquetes
dotnet restore
```

---

## 8. Checklist de Definición de Terminado (DoD) para Agentes

- [ ] ¿El cambio está respaldado por y alineado con la especificación en backendSDD/?
- [ ] ¿Se utilizaron los términos exactos del Lenguaje Ubicuo sin inventar sinónimos?
- [ ] ¿El código respeta la arquitectura hexagonal y la regla de dependencias hacia el centro?
- [ ] ¿El modelo de dominio contiene las invariantes requeridas y evita modelos anémicos?
- [ ] ¿Se crearon o actualizaron tests unitarios (BDD style) para las reglas de negocio?
- [ ] ¿Se actualizó la trazabilidad/estado (checklists) en los archivos aplicables tras la implementación?
- [ ] ¿La solución compila sin advertencias ni errores (dotnet build)?
- [ ] ¿No se introdujeron secretos, tokens o credenciales en el código?
- [ ] (Infraestructura) ¿Se verifico mediante un escaneo transversal de 'Zentric.Domain' que ninguna entidad preexistente haya quedado por fuera del DbContext (Anti-Amnesia)?

---




