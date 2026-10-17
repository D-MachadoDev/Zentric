import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { LogoMark } from '@zentric/ui/logo';

interface PublicLayoutProps {
  children?: ReactNode;
}

/**
 * Shell para pantallas públicas y de autenticación (C4-4-Codigo-React.md §2: AuthShell).
 *
 * Aplica:
 * - Lienzo carbón azulado profundo (`#0A0E1A`).
 * - Iluminación focal superior controlada (`radial-gradient(circle at 50% 0%, rgba(0, 212, 170, 0.12), transparent 65%)`).
 * - Logotipo central y pie de página con enlace a telemetría de salud.
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Resplandor radial focal superior (Doctrina Anti-IA Genérica) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-60"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(0, 212, 170, 0.12), transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Cabecera mínima */}
      <header className="relative z-10 flex h-16 items-center justify-between border-b border-border-subtle px-6">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark className="size-6 text-brand" />
          <span className="text-sm font-bold tracking-tight text-foreground">Zentric Core</span>
        </Link>
        <Link
          to="/health"
          className="text-xs text-foreground-subtle transition-colors hover:text-foreground-muted"
        >
          Estado del Sistema
        </Link>
      </header>

      {/* Contenido principal */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Pie de página institucional */}
      <footer className="relative z-10 flex h-14 items-center justify-between border-t border-border-subtle px-6 text-xs text-foreground-subtle">
        <span>© {new Date().getFullYear()} Zentric Marketplace Inc.</span>
        <span>Consola Operativa Suiza</span>
      </footer>
    </div>
  );
}
