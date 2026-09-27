import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuracion base de la consola operativa Zentric.
// Contrato completo en frontendSDD/Frontend-Architecture.md y Frontend-Adapters.md.
//
// La URL base se resuelve en tiempo de build (VITE_API_BASE_URL) y puede
// sobreescribirse en tiempo de ejecucion mediante
// window.__ZENTRIC_API_BASE_URL (inyectado por nginx en la imagen Docker).
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
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
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
}));