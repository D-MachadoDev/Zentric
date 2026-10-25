import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const apiBaseUrl = env.VITE_API_BASE_URL ?? 'http://localhost:15433';
  // `Number(...)` nunca devuelve null/undefined, asi que `??` era codigo muerto:
  // un puerto vacio ("") producia NaN en lugar del valor por defecto.
  const devPort = env.VITE_PORT ? Number(env.VITE_PORT) : 15434;
  const previewPort = env.VITE_PREVIEW_PORT ? Number(env.VITE_PREVIEW_PORT) : 15435;
  const proxyTarget = env.VITE_PROXY_TARGET ?? 'http://localhost:15433';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }],
    },
    define: {
      __API_BASE_URL__: JSON.stringify(apiBaseUrl),
    },
    server: {
      port: devPort,
      host: true,
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
        '/health': { target: proxyTarget, changeOrigin: true },
      },
    },
    preview: {
      port: previewPort,
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
  };
});
