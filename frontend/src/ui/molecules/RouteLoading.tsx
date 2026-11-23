export interface RouteLoadingProps {
  /** Mensaje contextual accesible para screen readers */
  message?: string;
}

/**
 * Estado de carga de ruta transparente y no invasivo.
 * No genera cajas artificiales ni saltos de layout (CLS).
 * La indicación visual de carga corre a cargo de TopProgressBar
 * en el borde superior del navegador.
 */
export function RouteLoading({
  message = 'Cargando contenido…',
}: RouteLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 w-full min-h-[300px] sm:min-h-[380px] items-center justify-center p-4 select-none opacity-60 transition-opacity duration-300"
    >
      <span className="sr-only">{message}</span>

      {/* Indicador minimalista y sereno: solo el punto de acento Zentric en pulso tenue */}
      <div className="flex items-center gap-2" aria-hidden="true">
        <span className="size-2 rounded-full bg-teal-600/40 dark:bg-teal-400/40 animate-ping" />
        <span className="size-1.5 rounded-full bg-teal-600 dark:text-teal-400" />
      </div>
    </div>
  );
}
