import type { ReactNode } from 'react';

/**
 * Shell raíz de la consola.
 *
 * F1 deja sólo la estructura base. La barra lateral fija (>900px) y la
 * navegación horizontal (<=900px) llegan con los módulos por rol (F4),
 * regidas por las rupturas de Frontend-Design-System.md seccion 6.
 */
export function RootLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">{children}</div>
  );
}
