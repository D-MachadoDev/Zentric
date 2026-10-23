import type { ErrorComponentProps } from '@tanstack/react-router';
import { Button } from '@zentric/ui/components/ui/button';
import { isApiError } from '../../domain';
import { RolNoAutorizadoError } from './guards';

/**
 * Estado de error de ruta.
 *
 * Se distinguen dos casos con comportamientos deliberadamente distintos:
 *
 * - **Rol equivocado:** estado `403` que **conserva la sesión**. Redirigir a
 *   `/entrar` destruiría una sesión perfectamente válida sólo porque el usuario
 *   pulsó un enlace que no le corresponde — y así actúa también el servidor: un
 *   `403` no cierra la sesión.
 * - **Cualquier otro fallo:** mensaje genérico con `traceId` cuando lo hay. El
 *   `error.message` de una excepción inesperada NO se pinta: puede arrastrar
 *   detalles técnicos que no deben exponerse al usuario.
 */
export function RouteErrorComponent({ error, reset }: ErrorComponentProps) {
  if (error instanceof RolNoAutorizadoError) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-12">
        <p className="text-sm font-semibold tracking-wide text-warning">403</p>
        <h1 className="text-3xl font-semibold">Sección reservada</h1>
        <p className="text-foreground/70">{error.message}</p>
        <p className="text-sm text-foreground/60">
          Tu sesión sigue iniciada: sólo esta sección no corresponde a tu rol.
        </p>
        <div>
          <Button variant="outline" onClick={reset}>
            Volver
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-12">
      <h1 className="text-3xl font-semibold">Algo salió mal</h1>
      <p className="text-foreground/70">
        No se pudo cargar esta sección.
        {referenciaDeSoporte(error)}
      </p>
      <div>
        <Button variant="outline" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </main>
  );
}

/**
 * Sólo un `5xx` tiene `traceId`, y §5 exige ofrecerlo para soporte: sin él el
 * usuario no tiene nada que reportar y el equipo no tiene por qué rastrear.
 *
 * Recibe `unknown` porque eso es lo que TanStack entrega al errorComponent.
 */
function referenciaDeSoporte(error: unknown): string {
  if (!isApiError(error) || error.traceId === undefined) {
    return ' Inténtalo de nuevo o contacta con soporte.';
  }
  return ` Inténtalo de nuevo; si persiste, reporta la referencia ${error.traceId}.`;
}
