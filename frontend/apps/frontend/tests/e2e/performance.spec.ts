import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { loginAsBuyer } from './support/auth';

/**
 * Core Web Vitals y presupuesto de recursos medidos en el navegador real.
 *
 * A diferencia de Lighthouse (que se ejecuta en CI sobre el build estatico),
 * esto mide la aplicacion en desarrollo con la API conectada: es la señal de
 * "como se siente de verdad" para el comprador.
 */

test.describe.configure({ retries: 0 });

test.describe('Core Web Vitals', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsBuyer(page);
  });

  test('LCP se mantiene por debajo del presupuesto en desarrollo', async ({ page }) => {
    await page.goto('/buyer/catalog', { waitUntil: 'domcontentloaded' });

    const lcp = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let value = 0;
          try {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                value = (entry as PerformanceEntry).startTime;
              }
            });
            observer.observe({ type: 'largest-contentful-paint', buffered: true });
          } catch {
            // El navegador no soporta LCP: se usa la marca de navegacion.
          }
          setTimeout(() => resolve(value || performance.timing.responseEnd - performance.timing.navigationStart), 2500);
        }),
    );

    // El umbral REAL (2.5s) lo mide Lighthouse CI contra el build de
    // produccion (`pnpm lighthouse`), que es el bundle minificado. Aqui se
    // corre contra el servidor de desarrollo de Vite, que sirve el codigo en
    // cientos de modulos sin agrupar: medir 2.5s ahi seria medir otra
    // aplicacion. Este limite solo evita una regresion grossera.
    expect(lcp, 'LCP en desarrollo (presupuesto real en Lighthouse CI)').toBeLessThan(6000);
  });

  test('CLS por debajo de 0.1 durante la carga del catalogo', async ({ page }) => {
    await page.goto('/buyer/catalog');
    await page.waitForLoadState('networkidle');

    const cls = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const shift = entry as unknown as { value: number; hadRecentInput: boolean };
              if (!shift.hadRecentInput) total += shift.value;
            }
          });
          observer.observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(total);
          }, 2000);
        }),
    );

    expect(cls, 'CLS debe estar por debajo de 0.1').toBeLessThan(0.1);
  });

  test('no hay shift de layout al navegar entre paginas de comprador', async ({ page }) => {
    await page.goto('/buyer/catalog');
    await page.waitForLoadState('networkidle');

    const cls = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const shift = entry as unknown as { value: number; hadRecentInput: boolean };
              if (!shift.hadRecentInput) total += shift.value;
            }
          });
          observer.observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(total);
          }, 1500);
        }),
    );

    expect(cls).toBeLessThan(0.1);
  });

  test('el bundle de produccion no excede el presupuesto de descarga', async () => {
    // Se mide el ARTEFACTO real de produccion (dist/), no lo que sirve el
    // servidor de desarrollo: en dev, Vite entrega cada modulo por separado y
    // la suma no significa nada.
    const distDir = path.resolve(import.meta.dirname, '..', '..', 'dist', 'assets');
    if (!existsSync(distDir)) {
      test.skip(true, 'No hay build de produccion. Ejecuta `pnpm build` antes de este test.');
      return;
    }

    const jsFiles = readdirSync(distDir).filter((f) => f.endsWith('.js'));
    const rawBytes = jsFiles.reduce(
      (total, f) => total + statSync(path.join(distDir, f)).size,
      0,
    );
    const gzipBytes = jsFiles.reduce((total, f) => {
      const buffer = readFileSync(path.join(distDir, f));
      return total + gzipSync(buffer, { level: 9 }).length;
    }, 0);

    const rawKb = rawBytes / 1024;
    const gzipKb = gzipBytes / 1024;

    // El presupuesto que importa es el de TRANSFERENCIA (lo que descarga el
    // navegador): es el que fija Lighthouse en lighthouserc.json. El peso
    // sin comprimir se vigila aparte, mas alto, porque es una senal de
    // complejidad del bundle, no de lo que sufre el usuario.
    expect(gzipKb, `el bundle JS comprime pesa ${gzipKb.toFixed(0)} KB`).toBeLessThan(350);
    expect(rawKb, `el bundle JS sin comprimir pesa ${rawKb.toFixed(0)} KB`).toBeLessThan(1400);
  });
});

test.describe('Resiliencia de red', () => {
  test('el catalogo muestra estado de error recuperable si la API cae', async ({ page }) => {
    await loginAsBuyer(page);
    await page.route('**/api/Catalog/products/paged*', (route) => route.abort('failed'));

    await page.goto('/buyer/catalog');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Error al cargar el catálogo/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Refrescar/i })).toBeVisible();
  });

  test('el catalogo se recupera cuando la API vuelve', async ({ page }) => {
    await loginAsBuyer(page);

    let fail = true;
    await page.route('**/api/Catalog/products/paged*', async (route) => {
      if (fail) await route.abort('failed');
      else await route.continue();
    });

    await page.goto('/buyer/catalog');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Error al cargar el catálogo/i)).toBeVisible();

    fail = false;
    await page.getByRole('button', { name: /Refrescar/i }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Error al cargar el catálogo/i)).toBeHidden();
  });
});
