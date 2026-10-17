import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@zentric/ui/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Límite global de errores de renderizado para React 19 (C4-4-Codigo-React.md §1).
 *
 * Captura excepciones catastróficas en el árbol de componentes y ofrece una
 * recuperación controlada mediante recarga limpia de la consola, evitando la
 * pantalla blanca sin diagnóstico.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Registro defensivo en telemetría de consola
    console.error('[GlobalErrorBoundary] Error no controlado en render:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          aria-live="assertive"
          className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground"
        >
          <div className="w-full max-w-lg space-y-6 rounded-xl border border-border bg-surface p-8 shadow-2xl">
            <div className="space-y-2">
              <span className="inline-block rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
                Error Inesperado
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Algo interrumpió la consola
              </h1>
              <p className="text-sm text-foreground-muted">
                Se produjo un fallo inesperado en el renderizado de la interfaz. La sesión en memoria
                se mantiene protegida.
              </p>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-muted p-4 text-left">
              <p className="font-mono text-xs text-foreground-subtle break-words">
                {this.state.error?.message ?? 'Fallo de ejecución desconocido.'}
              </p>
            </div>

            <div className="flex justify-center gap-3">
              <Button variant="default" onClick={this.handleReset}>
                Reiniciar Consola
              </Button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
