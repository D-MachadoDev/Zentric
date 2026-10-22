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
    //
    // Solo las de la grilla: el carrusel NO se enmascara imagen por imagen.
    // Su pista tiene desplazamiento horizontal, y la caja de una imagen
    // desplazada sale del recorte del contenedor: la mascara se pintaba
    // fuera de la pagina y el diff aparecia en el margen, sin que nada del
    // diseno hubiera cambiado. La seccion completa ya queda tapada.
    page.locator('#product-grid img'),
  ];
}

/**
 * Espera a que todas las imagenes visibles hayan terminado de cargar.
 *
 * Sin esto, la foto puede aparecer a medio cargar en el instante del
 * snapshot y producir un diff que no corresponde a un cambio del diseno.
 */
async function waitForImages(page: Page) {
  // Con rutas perezosas la red no se queda quieta: el chunk de la pagina se
  // pide despues del primer pintado. Se espera al DOM y a las imagenes.
  await page.waitForLoadState('domcontentloaded');
  await page
    .waitForFunction(
      () => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
      undefined,
      { timeout: 20_000 },
    )
    .catch(() => {
      // Si alguna imagen no carga (red lenta), se sigue: el snapshot sera
      // distinto, pero la prueba no debe bloquear el pipeline por una foto.
    });
  await waitForCatalogContent(page);
  await page.waitForTimeout(500);
}

/**
 * Espera a que la grilla del catalogo tenga su CONTENIDO, no su esqueleto.
 *
 * Sin esto, la foto podia capturar el estado de carga: la grilla con ocho
 * esqueletos es mas corta que la grilla con los once productos, y la
 * diferencia de alto (miles de pixeles) hacia fallar el snapshot sin que
 * hubiera cambiado nada del diseno. La banda de catalogo solo aparece
 * cuando la consulta termino.
 */
async function waitForCatalogContent(page: Page) {
  const grid = page.locator('#product-grid');
  if ((await grid.count()) === 0) return;

  await page
    .waitForFunction(
      () => {
        const node = document.querySelector('#product-grid');
        if (!node) return false;
        const vacio = document.querySelector('[role="status"]');
        return node.querySelectorAll('h3').length > 0 || vacio !== null;
      },
      undefined,
      { timeout: 20_000 },
    )
    .catch(() => {
      // Si la grilla no llega a poblar, la prueba debe fallar por el diff
      // y no quedarse colgada esperando.
    });
}

/**
 * Imagen 1x1 PNG en base64.
 *
 * Sirve las fotos de producto que vienen de un CDN externo. Un baseline de
 * pixel no puede depender de lo que sirva ese CDN en ese momento: la primera
 * corrida tras un arranque frio tarda mas en cargar, el contenido puede
 * variar y el diff aparece sin que haya cambiado el diseno. Servir un
 * placeholder local hace el snapshot REPRODUCIBLE y ademas mas rapido
 * (ninguna peticion de imagen sale a internet).
 */
const PLACEHOLDER_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test.describe('Snapshots visuales', () => {
  // Con carga perezosa de rutas, la pagina tarda mas en montar (chunk de la
  // ruta + sus imagenes) y la captura de pagina completa a 375 px es un
  // recorrido largo. 60 s de margen evitan que un baseline valido se lea
  // como regresion por tiempo.
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    // El carrusel de "Productos populares" auto-avanza cada 5 s, de modo que la
    // posicion del scroll (y por tanto los bordes de las tarjetas visibles)
    // dependen del instante de la captura. El componente respeta
    // `prefers-reduced-motion`, asi que reducir el movimiento lo congela: es
    // el mismo mecanismo que usa un usuario con esa preferencia del sistema.
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // `global.css` declara `scroll-behavior: smooth`. La captura de pagina
    // completa de Playwright desplaza el documento para abarcarlo entero, y
    // con el scroll suave ese desplazamiento es una ANIMACION: la foto
    // salia a medio recorrer y devolvia una pagina en blanco. Aqui el scroll
    // es instantaneo, que es lo que una captura necesita.
    //
    // Se inyecta con `addInitScript` (y no con `addStyleTag`) porque cada
    // prueba navega despues: una etiqueta de estilo suelta se pierde con la
    // navegacion, y un script de inicializacion sobrevive a todas.
    await page.addInitScript(() => {
      const apply = () => {
        const style = document.createElement('style');
        style.textContent = 'html, body, #root { scroll-behavior: auto !important; }';
        document.head.appendChild(style);
      };
      if (document.head) {
        apply();
      } else {
        document.addEventListener('DOMContentLoaded', apply);
      }
    });

    await page.route(
      /https?:\/\/(?!localhost|127\.0\.0\.1)[^/]+\/.*\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/i,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'image/png',
          body: Buffer.from(PLACEHOLDER_PNG, 'base64'),
        }),
    );
  });

  for (const vp of VIEWPORTS) {
    test(`catalogo - ${vp.name}`, async ({ page }, testInfo) => {
      // Un proyecto de dispositivo MOVIL no se fotografia a 1440 px: el
      // perfil de iPhone con factor de escala 3 y una ventana de escritorio
      // produce capturas de pagina completa que webkit no estabiliza (la
      // referencia sale en blanco). Cada motor mide el ancho para el que
      // esta disenado.
      const esMovil = testInfo.project.name.startsWith('mobile');
      if (esMovil && vp.name === 'desktop') {
        test.skip(true, 'El proyecto movil ya mide su propio ancho de pantalla.');
      }

      await loginAsBuyer(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/buyer/catalog');
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
    test(`${route.name} - desktop`, async ({ page }, testInfo) => {
      // Mismo motivo que en el catalogo: un perfil de dispositivo movil no
      // se fotografía a 1440 px.
      if (testInfo.project.name.startsWith('mobile')) {
        test.skip(true, 'El proyecto movil ya mide su propio ancho de pantalla.');
      }

      if (route.name !== 'login') await loginAsBuyer(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route.path);
      await waitForImages(page);

      await expect(page).toHaveScreenshot(`${route.name}-desktop.png`, {
        fullPage: true,
        mask: volatileMask(page),
        maxDiffPixels: 150,
        animations: 'disabled',
      });
    });
  }

  test('el catalogo en modo oscuro mantiene la identidad de rol', async ({ page }, testInfo) => {
    // Mismo motivo que en el catalogo: un perfil de dispositivo movil no
    // se fotografia a 1440 px.
    if (testInfo.project.name.startsWith('mobile')) {
      test.skip(true, 'El proyecto movil ya mide su propio ancho de pantalla.');
    }

    await loginAsBuyer(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    // El tema de la aplicacion NO lo decide el sistema: lo decide
    // `localStorage['zentric.theme']` (ThemeProvider). Emular
    // `prefers-color-scheme: dark` no cambiaba nada, de modo que esta
    // prueba fotografiaba el modo claro y lo llamaba "oscuro": el tema
    // "Boveda Grafito" no tenia cobertura visual ninguna.
    await page.addInitScript(() => {
      window.localStorage.setItem('zentric.theme', 'dark');
    });

    await page.goto('/buyer/catalog');
    await waitForImages(page);

    // El modo oscuro tiene que estar REALMENTE aplicado: si el proveedor
    // dejara de leer la preferencia, la foto seria la del modo claro y la
    // prueba volveria a pasar sin comprobar nada.
    await expect(page.locator('html.dark')).toBeAttached();

    // La identidad de rol se mantiene: el acento del comprador es jade en
    // los dos modos, no el cian del modo oscuro por defecto.
    const brand = await page.evaluate(() =>
      getComputedStyle(document.querySelector('[data-role="buyer"]') ?? document.documentElement)
        .getPropertyValue('--brand')
        .trim(),
    );
    expect(brand.toUpperCase()).toBe('#2DD4BF');

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
    await waitForImages(page);

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
    await waitForImages(page);

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
