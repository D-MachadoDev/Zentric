import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * Proveedor de datos remotos (Q9: TanStack Query).
 *
 * Se crea UNA sola vez por montaje de la app: crearlo dentro del render
 * descartaria la caché en cada repintado.
 */
export function AppQueryClientProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            // Un 4xx es una respuesta del servidor, no una caída transitoria:
            // reintentar sólo enmascara el error y retrasa el mensaje al usuario.
            retry: (failureCount, error) => {
              const status = (error as { status?: number }).status;
              if (typeof status === 'number' && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
