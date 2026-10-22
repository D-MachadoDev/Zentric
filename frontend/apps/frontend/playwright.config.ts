import { defineConfig, devices } from '@playwright/test';

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
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:15434',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_API_BASE_URL: API_BASE_URL,
    },
  },
  expect: {
    // La captura de pagina completa tarda mas de 5 s en webkit (motor de
    // Safari): con el limite por defecto de Playwright, la propia captura
    // se agotaba antes de comparar y la prueba fallaba sin llegar a
    // comprobar el pixel. El margen de 30 s es el que el propio motor
    // necesita para estabilizar la imagen.
    timeout: 30_000,
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },
  snapshotDir: './tests/e2e/__snapshots__',
  // Un baseline POR NAVEGADOR. Con un unico archivo compartido, el motor que
  // renderiza distinto (tipografias y antialias de cada motor) hacia fallar
  // siempre en los cuatro navegadores que no son el que genero la referencia:
  // la suite Thenmaba ser una comprobacion de diseno y se convertia en una
  // comprobacion de coincidencia de motores.
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFileDir}/{projectName}/{arg}{ext}',
});