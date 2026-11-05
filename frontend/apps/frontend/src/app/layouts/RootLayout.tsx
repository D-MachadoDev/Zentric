import type { ReactNode } from 'react';

/**
 * Shell raíz de la consola Zentric.
 */
export function RootLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-background text-foreground antialiased">{children}</div>
  );
}
