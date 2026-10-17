import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../providers/ThemeProvider';
import { Button } from '@zentric/ui/components/ui/button';

/**
 * Selector de tema dual accesible (ADDENDUM §9 "Porcelana y Grafito").
 * Alterna entre modo claro "Estudio Porcelana" (por defecto) y modo oscuro
 * "Bóveda Grafito". La persistencia y la clase .dark las gobierna ThemeProvider.
 *
 * El icono es neutro (foreground-muted): el ámbar queda reservado al estado
 * semántico de advertencia y el jade a las acciones, no a los conmutadores.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="h-8 w-8 rounded-full p-0 text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
