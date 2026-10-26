import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Logo } from '@zentric/ui/logo';

interface PublicLayoutProps {
  children?: ReactNode;
}

/**
 * Shell para pantallas públicas y de autenticación (AuthShell).
 *
 * Aplica (Frontend-Design-System sección 9):
 * - Lienzo porcelana en claro / grafito-tinta en oscuro (#0B0F19 / #111827),
 *   con superficies limpias de alta legibilidad y tokens semánticos.
 * - Logotipo central y pie de página con enlace a telemetría de salud.
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Cabecera institucional limpia */}
      <header className="relative z-10 flex h-16 items-center justify-between border-b border-border bg-background/85 px-6 backdrop-blur-md overscroll-contain">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Zentric - Inicio">
            <Logo className="size-7 shrink-0" />
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/buyer"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-foreground-muted transition-colors hover:border-brand/40 hover:text-brand"
          >
            Tienda Compradores
          </Link>
          <Link
            to="/acceso-corporativo"
            className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-foreground-muted transition-colors hover:border-brand/40 hover:text-brand"
          >
            Acceso Vendedores
          </Link>
          <Link
            to="/health"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-foreground-muted transition-colors hover:border-brand/40 hover:text-foreground"
          >
            <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
            Estado del Sistema
          </Link>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-10">
        {children}
      </main>

      {/* Pie de página institucional con enlaces legales */}
      <footer className="relative z-10 flex h-14 items-center justify-between border-t border-border bg-background/85 px-6 font-mono text-xs text-foreground-subtle backdrop-blur-md">
        <span>© {new Date().getFullYear()} Zentric Marketplace Inc.</span>
        <nav className="flex items-center gap-4" aria-label="Enlaces legales">
          <Link to="/terms" className="text-foreground-subtle hover:text-brand transition-colors">Términos</Link>
          <Link to="/privacy" className="text-foreground-subtle hover:text-brand transition-colors">Privacidad</Link>
          <Link to="/cookies" className="text-foreground-subtle hover:text-brand transition-colors">Cookies</Link>
          <Link to="/legal" className="text-foreground-subtle hover:text-brand transition-colors">Aviso Legal</Link>
        </nav>
        <span>Consola Operativa Suiza · Doble Tema Porcelana/Grafito · v2.0.0</span>
      </footer>
    </div>
  );
}
