# ADR-0025 — La no-negatividad del stock se garantiza con un UPDATE condicional atómico

- **Estado:** Aceptado
- **Fecha:** 2026-10-05
- **Dictado por:** Owner (grill de la capa Domain)
- **Modifica:** la regla INV-01 y el puerto `IInventoryRepository` de `05-ports.md`
- **Precisa:** [ADR-0021](ADR-0021-ajuste-de-stock-sin-cuello-de-botella.md) (ajuste sin cuello de botella)

## Contexto

`INV-01` es la regla más dura del sistema: **`AvailableQuantity` nunca puede ser `< 0`**. El guard en `Inventory.ReserveStock` la cumple… **solo para una copia en memoria**. No protege contra dos peticiones a la vez.

```
Petición A lee "quedan 5"  ─┐
                            ├─ las dos descuentan → acaba en 4, no en 3
Petición B lee "quedan 5"  ─┘
```

Es un **lost update**: la base tiene un valor que nunca existió. Con 1 unidad y dos compradores se puede llegar a `-1`, prohibido por la Ley (Dominio 6).

El error de enfoque fue creer que hacía falta saber **quién llega primero en milisegundos**. No: el problema nunca fue el orden, sino el hueco entre **leer** y **escribir**. Si leer-comprobar-escribir es **una sola operación**, el orden deja de importar.

Hoy `IInventoryRepository` no expone token de concurrencia ni bloqueo alguno, así que la garantía no está en ninguna parte.

## Alternativas consideradas

| | Opción | Por qué se descartó |
|---|---|---|
| **A** | `UPDATE` condicional atómico: la base hace leer-comprobar-escribir de una vez | — **Elegida** |
| **B** | Token de concurrencia optimista (`IsConcurrencyToken`) | **Avisa** del choque pero **no impide** el `-1`: hay que reintentar y aun así comprobar el stock |
| **C** | Bloqueo pesimista (`SELECT … FOR UPDATE`) | Funciona, pero es exactamente el **cuello de botella** que `ADR-0021` decide evitar |

## Decisiones

1. **La reserva es un solo `UPDATE` condicional:**
   ```sql
   UPDATE inventory
      SET available = available - @n
    WHERE variant_id = @id
      AND available >= @n;
   ```
   **Cero filas afectadas = no había stock = se rechaza.** La base se niega sola a dejarlo negativo; nunca hace falta saber qué petición llegó primero.
2. **La garantía vive en la base de datos, no en el puerto.** El repositorio expone la operación atómica; no implementa concurso.
3. **El guard del dominio se mantiene** como defensa en profundidad y como documentación de la regla — pero **no es la garantía**.
4. **Sin cuello de botella:** el candado dura lo que dura una sentencia, no lo que dura la transacción completa.
5. El README ya declara este diseño («control atómico de existencias», «contadores atómicos»): el código pasa a cumplir lo que la spec ya prometía.

## Consecuencias

- `INV-01` queda cerrado con una garantía **verificable**: una prueba con dos hilos simultáneos que nunca deja stock negativo.
- `IInventoryRepository` debe exponer esa operación; la marca de `05-ports.md` se retira.
- No se introduce framework de concurrencia ni nueva dependencia: es una sentencia SQL.
