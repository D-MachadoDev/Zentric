import type { ReactNode } from 'react';
import { lazy, Suspense } from 'react';
import { TopProgressBar } from '../../ui/molecules/TopProgressBar';

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : () => null;

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )
  : () => null;

/**
 * Shell raíz de la consola Zentric.
 */
export function RootLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-background text-foreground antialiased">
      <TopProgressBar />
      {children}
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
          <TanStackRouterDevtools position="bottom-left" />
        </Suspense>
      )}
    </div>
  );
}
