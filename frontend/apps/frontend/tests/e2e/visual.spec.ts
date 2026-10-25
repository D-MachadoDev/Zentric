import { test, expect, type Page } from '@playwright/test';
import { loginAsBuyer } from './support/auth';

/**
 * Verificacion visual FUNCIONAL del frontend de Zentric.
 *
 * Este archivo NO usa snapshots de pixel: no hay imagenes de baseline en el
 * repo y no existe ninguna llamada a `toHaveScreenshot`. Un baseline obliga a
 * regenerar docenas de PNG cada vez que cambia el diseno, y en la practica
 * todos sus fallos fueron falsos positivos: datos de una base COMPARTIDA que
 * crece entre corridas, estado viejo y render distinto entre motores.
 *
 * Lo que aqui se comprueba es por ASERCION, que es exactamente lo que no se
 * rompe cuando el diseno cambia a proposito: estructura de la pagina,
 * contenido estable y tokens de color del rol.
 */

test.describe.configure({ retries: 0 });

/**
 * Datos congelados para la verificacion visual.
 *
 * El catalogo vive en una base COMPARTIDA: crece entre corridas (seeds, pruebas
 * de vendedor, migraciones) y su contenido cambia sin que nadie toque el
 * diseno. Contra datos reales la prueba mide la BASE, no la interfaz: la
 * altura de la grilla cambia, las tarjetas cambian de largo y el test falla
 * en verde.
 *
 * Por eso se asienta sobre un catalogo FIJO: mismos 12 productos (exactamente
 * `CATALOG_PAGE_SIZE`, para que la pagina 1 siempre este llena y la
 * paginacion diga lo mismo), mismas categorias y mismo hero. A partir de ahi
 * los cambios observables vienen de la interfaz y no de los datos.
 */
const FIXTURE_CATEGORIES = [
  { id: 'cat-1', name: 'Audio', productCount: 4 },
  { id: 'cat-2', name: 'Componentes', productCount: 3 },
  { id: 'cat-3', name: 'Monitores', productCount: 2 },
  { id: 'cat-4', name: 'Perifericos', productCount: 2 },
  { id: 'cat-5', name: 'Software', productCount: 1 },
];

const FIXTURE_PRODUCTS = [
  'Auriculares Studio Pro',
  'Teclado Mecanico Ergonomico',
  'Monitor Curvo 34 pulgadas',
  'Silla Ergonomica Ejecutiva',
  'Webcam 4K con microfono',
  'Disco SSD 2 TB NVMe',
  'Router Wi-Fi 6E dual band',
  'Base de enfriamiento USB-C',
  'Suite de oficina perpetua',
  'Antivirus 3 dispositivos',
  'Micrófono de condensador',
  'Laptop ultradelgada 14 pulgadas',
].map((name, i) => ({
  id: `fixture-product-${i + 1}`,
  name,
  // Longitud IDENTICA en todas: si un texto envuelve en dos lineas y otro en
  // una, la grilla cambia de alto por el contenido y no por el diseno.
  description:
    'Descripcion de referencia con largo fijo para que todas las tarjetas midan exactamente lo mismo.',
  price: 1200 + i * 150,
  currency: 'USD',
  vendorId: 'fixture-vendor',
  type: i % 5 === 4 ? 'Digital' : 'Physical',
  status: 'Published',
  variants: [
    {
      id: `fixture-variant-${i + 1}`,
      sku: `FIX-${String(i + 1).padStart(3, '0')}`,
      canBeSold: true,
      availableStock: 25,
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  // Termina en `.png` para que la ruta del placeholder (abajo) la intercepte y
  // ninguna peticion de imagen salga a internet.
  imageUrl: 'https://assets.zentric.local/fixture.png',
  category: FIXTURE_CATEGORIES[i % FIXTURE_CATEGORIES.length]!.name,
}));

const FIXTURE_PAGED = {
  items: FIXTURE_PRODUCTS,
  page: 1,
  size: 12,
  totalItems: FIXTURE_PRODUCTS.length,
  totalPages: 1,
  hasPrevious: false,
  hasNext: false,
};

/**
 * Pedidos congelados.
 *
 * NO es `[]`: la pagina de pedidos exige al menos un pedido para comprobar que
 * cada tarjeta expone su ID copiable, y un carrito vacio por contrato no tiene
 * esa estructura. Tampoco hace falta un `Cart`: el carrito se filtra por
 * estado, así que con uno `PendingPayment` y uno `Paid` queda vacio y fijo.
 */
const FIXTURE_ORDERS = [
  {
    id: '0f1e2d3c-4b5a-4978-8796-a5b4c3d2e1f0',
    buyerId: 'fixture-buyer',
    status: 'PendingPayment',
    currency: 'USD',
    totalAmount: 2450,
    itemCount: 2,
    createdAt: '2026-01-05T10:00:00.000Z',
    expiresAt: '2026-01-05T10:15:00.000Z',
    items: [
      {
        id: 'fixture-order-item-1',
        variantId: 'fixture-variant-1',
        quantity: 1,
        unitPrice: 1200,
        totalPrice: 1200,
        productName: 'Auriculares Studio Pro',
        sku: 'FIX-001',
      },
      {
        id: 'fixture-order-item-2',
        variantId: 'fixture-variant-2',
        quantity: 1,
        unitPrice: 1250,
        totalPrice: 1250,
        productName: 'Teclado Mecanico Ergonomico',
        sku: 'FIX-002',
      },
    ],
  },
  {
    id: 'b7a6c5d4-e3f2-4a19-9887-766554433221',
    buyerId: 'fixture-buyer',
    status: 'Paid',
    currency: 'USD',
    totalAmount: 1450,
    itemCount: 1,
    createdAt: '2026-01-04T09:30:00.000Z',
    items: [
      {
        id: 'fixture-order-item-3',
        variantId: 'fixture-variant-3',
        quantity: 1,
        unitPrice: 1450,
        totalPrice: 1450,
        productName: 'Monitor Curvo 34 pulgadas',
        sku: 'FIX-003',
      },
    ],
  },
];

/**
 * Congela las respuestas que alimentan la pagina bajo prueba.
 *
 * Dos familias, por el mismo motivo: son estado que cambia entre corridas.
 *   - Catálogo: la base crece (seeds, altas de vendedor, migraciones).
 *   - Órdenes: la base ACUMULA pedidos, porque los propios tests de checkout
 *     crean algunos; el perfil los cuenta en "Total Pedidos / En Curso /
 *     Entregados" y el carrito pinta su contenido.
 */
async function freezeVolatileData(page: Page) {
  await page.route('**/api/Catalog/products/paged*', (route) =>
    route.fulfill({ json: FIXTURE_PAGED }),
  );
  await page.route('**/api/Catalog/products/hero*', (route) =>
    route.fulfill({ json: FIXTURE_PRODUCTS.slice(0, 6) }),
  );
  await page.route('**/api/Catalog/categories*', (route) =>
    route.fulfill({ json: FIXTURE_CATEGORIES }),
  );
  // Predicado sobre el pathname y no sobre un patrón glob: cubre las variantes
  // de mayúsculas (`/api/Orders` vs `/api/orders`) y cualquier query de
  // paginación sin tener que enumerarlas.
  await page.route(
    (url) => url.pathname.toLowerCase().startsWith('/api/orders'),
    async (route) => {
      // Sólo lectura: un POST/PUT congelado rompería una mutación legítima.
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({ json: FIXTURE_ORDERS });
    },
  );
}

/**
 * Espera a que todas las imagenes visibles hayan terminado de cargar.
 *
 * Sin esto, una asercion puede correr contra un DOM a medio montar: el
 * elemento todavia no existe y el test falla por tiempo en lugar de fallar
 * por el comportamiento que venia a comprobar.
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
      // Si alguna imagen no carga (red lenta), se sigue: la prueba no debe
      // bloquear el pipeline por una imagen.
    });
  await waitForCatalogContent(page);
  await page.waitForTimeout(500);
}

/**
 * Espera a que la grilla del catalogo tenga su CONTENIDO, no su esqueleto.
 *
 * Sin esto, una asercion puede correr contra el estado de carga: la grilla
 * con ocho esqueletos todavia no expone los `h3` reales. La banda de
 * catalogo solo aparece cuando la consulta termino.
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
      // Si la grilla no llega a poblar, la prueba debe fallar por la
      // asercion y no quedarse colgada esperando.
    });
}

/**
 * Imagen 1x1 PNG en base64.
 *
 * Sustituye las fotos de producto que vienen de un CDN externo. Ninguna
 * peticion de imagen sale a internet: la grilla se monta igual, el test es
 * mas rapido y deja de depender de que un tercero este arriba.
 */
const PLACEHOLDER_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test.describe('Regresion visual por asercion', () => {
  test.beforeEach(async ({ page }) => {
    // El carrusel de "Productos populares" auto-avanza cada 5 s. El componente
    // respeta `prefers-reduced-motion`, asi que reducir el movimiento lo
    // congela y deja la carga de imagenes estable mientras se aserta.
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Primero los datos, despues la imagen: el orden no cambia el resultado,
    // pero dejar el estado congelado antes de navegar evita que algun dia una
    // prueba corra contra la base real.
    await freezeVolatileData(page);

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

  test('el catalogo en modo oscuro mantiene la identidad de rol', async ({ page }, testInfo) => {
    // Un perfil de dispositivo movil no se fuerza a 1440 px: con
    // `isMobile: true` y `deviceScaleFactor: 3` esa combinacion describe un
    // equipo que no existe. El ancho de escritorio lo cubre el proyecto
    // desktop.
    if (testInfo.project.name.startsWith('mobile')) {
      test.skip(true, 'El proyecto movil ya mide su propio ancho de pantalla.');
    }

    await loginAsBuyer(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    // El tema de la aplicacion NO lo decide el sistema: lo decide
    // `localStorage['zentric.theme']` (ThemeProvider). Emular
    // `prefers-color-scheme: dark` no cambiaba nada: esta prueba pasaba
    // contra el tema claro y el tema "Boveda Grafito" quedaba sin cubrir.
    await page.addInitScript(() => {
      window.localStorage.setItem('zentric.theme', 'dark');
    });

    await page.goto('/buyer/catalog');
    await waitForImages(page);

    // El modo oscuro tiene que estar REALMENTE aplicado: si el proveedor
    // dejara de leer la preferencia, esta prueba pasaria sin comprobar nada.
    await expect(page.locator('html.dark')).toBeAttached();

    // La identidad de rol se mantiene: el acento del comprador es jade en
    // los dos modos, no el cian del modo oscuro por defecto.
    const brand = await page.evaluate(() =>
      getComputedStyle(document.querySelector('[data-role="buyer"]') ?? document.documentElement)
        .getPropertyValue('--brand')
        .trim(),
    );
    expect(brand.toUpperCase()).toBe('#2DD4BF');
  });

  test('la pagina de pedidos cumple su estructura', async ({ page }) => {
    // El listado de pedidos tampoco se mide: cada pedido nuevo lleva un GUID
    // y anade una tarjeta mas, de modo que la pagina crece entre ejecuciones y
    // cualquier medida seria ruido, no senal de regresion. Lo que si es
    // estable -la banda de KPI y la estructura de cada pedido- se comprueba
    // por asercion.
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
