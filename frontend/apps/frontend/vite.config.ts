import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Configuracion base de la consola operativa Zentric.
// Contrato completo en frontendSDD/Frontend-Architecture.md y Frontend-Adapters.md.
//
// La URL base se resuelve en tiempo de build (VITE_API_BASE_URL) y puede
// sobreescribirse en tiempo de ejecucion mediante
// window.__ZENTRIC_API_BASE_URL (inyectado por nginx en la imagen Docker).
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],

  resolve: {
    // Sin alias: @zentric/ui resuelve por el "exports" del workspace (pnpm
    // symlink -> packages/ui/src). Anadirlo aqui romperia los subcaminos
    // (@zentric/ui/styles/theme.css) porque el find casaria primero.
    alias: [{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }],
  },

  define: {
    __API_BASE_URL__: JSON.stringify(process.env.VITE_API_BASE_URL ?? 'http://localhost:5076'),
  },

  server: {
    port: 5173,
    host: true,
    // Opcion B del contrato (frontendSDD/Contract-alignment.md, seccion 4):
    // proxy que evita depender de CORS mientras el backend no lo habilite (R-02).
    proxy: {
      '/api': { target: 'http://localhost:5076', changeOrigin: true },
      '/health': { target: 'http://localhost:5076', changeOrigin: true },
    },
  },
  preview: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'threads',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/main.tsx',
        'src/domain/models/{Auth,Fulfillment,Health,Inventory,Invoice,Order,Product,Return,User,Warehouse}.ts',
        'src/domain/ports/**',
        'src/application/dto/**',
        'src/adapters/http/ZentricHttpClient.ts',
        'src/adapters/session/InMemorySession.ts',
        'src/app/routes/guards.ts',
        'src/components/AlertHost.tsx',
      ],
    },
  },
}));
