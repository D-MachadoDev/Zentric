import { defineConfig } from 'vitest/config';

// packages/ui contiene componentes con DOM, no solo TS puro: jsdom es el
// entorno por defecto. Los tests de tokens/libreria no lo notan.
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
