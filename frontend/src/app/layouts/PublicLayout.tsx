import { useEffect, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { PublicHeader } from '../components/PublicHeader';

interface PublicLayoutProps {
  children?: ReactNode;
}

/**
 * Shell para pantallas públicas y de autenticación (AuthShell).
 * En rutas de autenticación (/login, /entrar, /register), garantiza altura completa
 * (min-h-screen / 100vh) centrada verticalmente sin scroll innecesario.
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const isAuth =
    currentPath === '/login' ||
    currentPath === '/entrar' ||
    currentPath === '/register' ||
    currentPath === '/recuperar-contrasena' ||
    currentPath === '/restablecer-contrasena' ||
    currentPath === '/acceso-corporativo' ||
    currentPath === '/portal';

  // Título de documento dinámico
  useEffect(() => {
    if (currentPath === '/login' || currentPath === '/entrar') {
      document.title = 'Zentric · Iniciar Sesión';
    } else if (currentPath === '/register') {
      document.title = 'Zentric · Registro de Usuario';
    } else if (currentPath.includes('recuperar') || currentPath.includes('restablecer')) {
      document.title = 'Zentric · Recuperación de Acceso';
    } else {
      document.title = 'Zentric · Acceso Seguro';
    }
  }, [currentPath]);

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-zinc-800 selection:text-white dark:selection:bg-zinc-200 dark:selection:text-zinc-900 transition-colors duration-200">
      {/* Cabecera institucional unificada */}
      <PublicHeader />

      {/* Contenido principal */}
      <main
        className={`relative z-10 flex flex-1 items-center justify-center ${
          isAuth ? 'p-4 sm:p-6 my-auto' : 'p-4 sm:p-6 lg:p-10'
        }`}
      >
        {children}
      </main>

      {/* Pie de página institucional: en auth es distraction-free con sello de tranquilidad */}
      {isAuth ? (
        <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 py-4 text-xs text-zinc-500 dark:text-zinc-400 transition-colors">
          <div className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
            <svg
              className="size-3.5 text-teal-600 dark:text-teal-400 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            <span>Compra protegida · Garantía Zentric</span>
          </div>
          <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700" aria-hidden="true">·</span>
          <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">© {new Date().getFullYear()} Zentric Marketplace Inc.</span>
        </footer>
      ) : (
        <footer className="relative z-10 flex flex-col sm:flex-row min-h-14 items-center justify-between gap-3 border-t border-border bg-surface/95 px-6 py-3 font-mono text-xs text-foreground-subtle backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-3">
            <span>© {new Date().getFullYear()} Zentric Marketplace Inc.</span>
            <span className="text-border" aria-hidden="true">·</span>
            <span className="text-foreground-muted">Compra protegida</span>
          </div>
          <nav className="flex items-center gap-4 text-xs" aria-label="Enlaces legales">
            <Link to="/terms" className="text-foreground-subtle hover:text-brand transition-colors">Términos</Link>
            <Link to="/privacy" className="text-foreground-subtle hover:text-brand transition-colors">Privacidad</Link>
            <Link to="/cookies" className="text-foreground-subtle hover:text-brand transition-colors">Cookies</Link>
            <Link to="/legal" className="text-foreground-subtle hover:text-brand transition-colors">Aviso Legal</Link>
          </nav>
        </footer>
      )}
    </div>
  );
}
