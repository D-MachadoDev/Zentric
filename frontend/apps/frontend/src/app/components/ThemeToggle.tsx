import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../providers/ThemeProvider';
import { Button } from '@zentric/ui/components/ui/button';

/**
 * Selector de tema accesible (Decisión A2 en /grill-me).
 * Permite alternar entre Modo Claro (e-commerce profesional) y Modo Oscuro (consola suiza).
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
      className="h-8 w-8 p-0 rounded-full text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-warning" />
      ) : (
        <Moon className="h-4 w-4 text-brand" />
      )}
    </Button>
  );
}
