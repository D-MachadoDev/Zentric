import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

/**
 * URL de la API que usan los E2E.
 *
 * Se fija AQUI, de forma explicita, en vez de leer `process.env` a ciegas: un
 * `VITE_API_BASE_URL` obsoleto en el shell del desarrollador (o en la sesion
 * de CI) invalida toda la suite sin avisar. Para cambiar el destino se usa
 * `E2E_API_BASE_URL`, que es un nombre propio de los E2E.
 */
const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:15433';

// Se propaga al proceso de test para que los helpers de soporte lo vean.
process.env.VITE_API_BASE_URL = API_BASE_URL;

/**
 * Playwright E2E + Visual Regression + Accessibility config for Zentric
 * Runs against local dev servers (backend:15433, frontend:15434)
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Los E2E comparten UNA sola sesion de comprador y UNA sola base de datos
  // (la del stack local), asi que el estado del carrito, los pedidos y el
  // cataluto mutan entre tests. En paralelo, un test que agrega al carrito
  // cambia lo que ve otro que esta fotografiando: eso producia falsos
  // negativos de accesibilidad y snapshots no deterministas. Serializar es
  // el precio de compartir el estado, y es mas barato que un esquema de
  // aislamiento por test que este proyecto todavia no tiene.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:15434',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: [
    {
      // La API la levanta Playwright, no el shell: si el proceso se muere a
      // mitad de la suite, los tests fallan con ECONNREFUSED y parecen
      // regresiones de codigo cuando son caidas de infraestructura.
      command: 'dotnet run --project backend/Zentric.Api --urls http://localhost:15433',
      // Chequeo de PUERTO, no de URL: `/health` exige token y responde 401,
      // que un lector de URL tomaria por "todavia no esta listo". El propio
      // test se encarga de confirmar que la API responde.
      port: 15433,
      // `true` tambien en CI: alli el workflow ya dejo la API escuchando en
      // 15433, y con `false` Playwright intentaria levantar una SEGUNDA
      // instancia que no puede bindear el puerto y moriria antes de correr
      // un solo test.
      reuseExistingServer: true,
      timeout: 180_000,
      cwd: path.resolve(import.meta.dirname, '..', '..', '..'),
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:15434',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_API_BASE_URL: API_BASE_URL,
      },
    },
  ],
  expect: {
    // Las rutas se cargan con import dinamico, de modo que una asercion puede
    // tener que esperar ademas al chunk de la pagina. 30 s deja que una
    // pagina lenta falle por comportamiento y no por tiempo.
    timeout: 30_000,
  },
});