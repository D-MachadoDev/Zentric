import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { LogoMark } from '@zentric/ui/logo';

interface PublicLayoutProps {
  children?: ReactNode;
}

/**
 * Shell para pantallas públicas y de autenticación (C4-4-Codigo-React.md §2: AuthShell).
 *
 * Aplica (Frontend-Design-System §9):
 * - Lienzo porcelana en claro / grafito-tinta en oscuro con la retícula
 *   arquitectónica `bg-swiss-grid`, cuyo resplandor focal usa el jade de
 *   marca vía color-mix (ya no un rgba fijo del v1).
 * - Logotipo central y pie de página con enlace a telemetría de salud.
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Cabecera institucional con hairline e indicador indexical */}
      <header className="relative z-10 flex h-16 items-center justify-between border-b border-border bg-background/85 px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark className="size-6 text-brand" />
            <span className="text-sm font-bold tracking-tight text-foreground">Zentric Core</span>
          </Link>
          <span className="hidden h-4 w-px bg-border sm:inline-block" aria-hidden="true" />
          <span className="kicker-spike hidden sm:inline-flex">
            Sistema Operativo para Comercio · Reserva Atómica de 15 Minutos
          </span>
        </div>
        <Link
          to="/health"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-foreground-muted transition-colors hover:border-brand/40 hover:text-foreground"
        >
          <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
          Estado del Sistema
        </Link>
      </header>

      {/* Contenido principal */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-10">
        {children}
      </main>

      {/* Pie de página institucional */}
      <footer className="relative z-10 flex h-14 items-center justify-between border-t border-border bg-background/85 px-6 font-mono text-xs text-foreground-subtle backdrop-blur-md">
        <span>© {new Date().getFullYear()} Zentric Marketplace Inc.</span>
        <span>Consola Operativa Suiza · Doble Tema Porcelana/Grafito · v2.0.0</span>
      </footer>
    </div>
  );
}
