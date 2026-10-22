import { test, expect, type Page } from '@playwright/test';
import { loginAsBuyer } from './support/auth';

/**
 * Regresion visual (snapshots) del frontend de Zentric.
 *
 * Los snapshots son la "fotografia" del diseno: si un cambio de componente
 * altera la composicion, el pixel cambia y el test falla. Eso detecta
 * regresiones que un test funcional no ve.
 *
 * Regenerar tras un cambio de diseno INTENCIONAL:
 *   pnpm --filter frontend e2e:update-snapshots
 *
 * Nota de estabilidad: las imagenes remotas de producto (Unsplash) pueden
 * variar. Por eso se espera a `networkidle` y se fija una ventana de
 * tolerancia; si el proyecto decide servirlas localmente, la tolerancia
 * puede bajar a 0.
 */

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

const ROUTES = [
  { name: 'catalogo', path: '/buyer/catalog' },
  { name: 'carrito', path: '/buyer/cart' },
  { name: 'pedidos', path: '/buyer/orders' },
  { name: 'perfil', path: '/buyer/profile' },
  { name: 'login', path: '/login' },
] as const;

/** Paginas de rol que se fotografian ademas del catalogo. */
const ROUTE_SNAPSHOTS = ROUTES.filter(
  (r) => r.name !== 'catalogo' && r.name !== 'pedidos',
);

test.describe.configure({ retries: 0 });

/**
 * Elementos volatiles que se enmascaran en los snapshots.
 *
 * Dos fuentes de no-determinismo, ambas POR DISENO y no por defecto:
 *   1. La insignia del carrito depende de cuantos items hay en la base
 *      COMPARTIDA entre pruebas: cambia entre ejecuciones.
 *   2. El hero ("Productos destacados") muestra una muestra ALEATORIA de
 *      productos en cada peticion (regla del endpoint `products/hero`) y su
 *      carrusel auto-avanza cada 5 s, de modo que el pixel capturado depende
 *      del instante en que se hizo la foto.
 *
 * Enmascararlas deja el resto del pixel intacto y convierte el diff en algo
 * que significa algo.
 */
function volatileMask(page: Page) {
  return [
    page.getByRole('link', { name: /Carrito/i }).first(),
    page.locator('section[aria-label="Productos destacados"]').first(),
    page.locator('section[aria-label="Productos populares"]').first(),
    // Las fotos de producto vienen de un CDN remoto. Un baseline de pixel que
    // dependa de lo que sirva ese CDN en ese momento no es una senal de
    // regresion: es ruido de red. Lo que el snapshot debe vigilar es la
    // COMPOSICION (maquetacion, tipografia, color, ritmo vertical).
    page.locator('#product-grid img').first(),
  ];
}

/**
 * Espera a que todas las imagenes visibles hayan terminado de cargar.
 *
 * Sin esto, la foto puede aparecer a medio cargar en el instante del
 * snapshot y producir un diff que no corresponde a un cambio del diseno.
 */
async function waitForImages(page: Page) {
  await page.waitForLoadState('networkidle');
  await page
    .waitForFunction(
      () => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
      undefined,
      { timeout: 15_000 },
    )
    .catch(() => {
      // Si alguna imagen no carga (red lenta), se sigue: el snapshot sera
      // distinto, pero la prueba no debe bloquear el pipeline por una foto.
    });
  await page.waitForTimeout(300);
}

test.describe('Snapshots visuales', () => {
  for (const vp of VIEWPORTS) {
    test(`catalogo - ${vp.name}`, async ({ page }) => {
      await loginAsBuyer(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/buyer/catalog');
      await page.waitForLoadState('networkidle');
      await waitForImages(page);

      await expect(page).toHaveScreenshot(`catalogo-${vp.name}.png`, {
        fullPage: true,
        mask: volatileMask(page),
        maxDiffPixels: 150,
        animations: 'disabled',
      });
    });
  }

  for (const route of ROUTE_SNAPSHOTS) {
    test(`${route.name} - desktop`, async ({ page }) => {
      if (route.name !== 'login') await loginAsBuyer(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await waitForImages(page);

      await expect(page).toHaveScreenshot(`${route.name}-desktop.png`, {
        fullPage: true,
        mask: volatileMask(page),
        maxDiffPixels: 150,
        animations: 'disabled',
      });
    });
  }

  test('el catalogo en modo oscuro mantiene la identidad de rol', async ({ page }) => {
    await loginAsBuyer(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/buyer/catalog');

    // Fuerza el modo oscuro del sistema antes de cargar.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForImages(page);

    await expect(page).toHaveScreenshot('catalogo-oscuro-desktop.png', {
      fullPage: true,
      mask: volatileMask(page),
      maxDiffPixels: 150,
      animations: 'disabled',
    });
  });

  test('la pagina de pedidos cumple su estructura (sin baseline de pixel)', async ({ page }) => {
    // El listado de pedidos NO tiene baseline de pixel a proposito: cada
    // pedido nuevo lleva un GUID y anade una tarjeta mas, de modo que la
    // pagina crece entre ejecuciones y cualquier baseline seria ruido, no
    // senal de regresion. Lo que si es estable -la banda de KPI y la
    // estructura de cada pedido- se comprueba por asercion.
    await loginAsBuyer(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/buyer/orders');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Mis Pedidos' })).toBeVisible();
    await expect(page.getByText('Pendientes de Pago (15 min)')).toBeVisible();
    await expect(page.getByText('En Proceso y Despacho')).toBeVisible();

    // Cada pedido se identifica con un ID copiable (contrato de la UI).
    const copyButtons = page.getByRole('button', { name: 'Copiar ID del pedido' });
    const orders = page.getByText(/^Pedido #/);
    await expect(orders.first()).toBeVisible();
    expect(await orders.count()).toBe(await copyButtons.count());
  });

  test('el tema aplica el acento del rol al boton primario', async ({ page }) => {
    await loginAsBuyer(page);
    await page.goto('/buyer/catalog');
    await page.waitForLoadState('networkidle');

    // El layout de comprador ancla `data-role="buyer"` en su raiz.
    const roleScope = page.locator('[data-role="buyer"]');
    await expect(roleScope.first()).toBeVisible();

    const brand = await page.evaluate(() => {
      const el = document.querySelector('[data-role="buyer"]') ?? document.documentElement;
      return getComputedStyle(el).getPropertyValue('--brand').trim();
    });
    expect(brand.toUpperCase()).toBe('#0F766E');
  });
});
