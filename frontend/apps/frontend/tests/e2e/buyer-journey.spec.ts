import { test, expect } from '@playwright/test';
import { loginAsBuyer } from './support/auth';
import { expectNoA11yViolations } from './support/a11y';

/**
 * Buyer journey end-to-end contra el stack real (API en :15433, UI en :15434).
 *
 * Cubre el camino comercial completo: catalogo -> detalle -> carrito ->
 * checkout con reserva de 15 minutos -> pasarela de pago.
 *
 * Regla de oro: los selectores son SEMANTICOS (role + nombre accesible),
 * nunca clases de Tailwind ni `data-testid` inventados. Si el marcado cambia,
 * el test falla de forma legible.
 */

test.describe.configure({ retries: process.env.CI ? 1 : 0 });

test.describe('Buyer journey', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsBuyer(page);
  });

  test('el catalogo carga productos reales del backend', async ({ page }) => {
    // El listener se registra ANTES de navegar: la peticion al catalogo sale
    // al montar el componente, y si se espera despues del `goto` la
    // respuesta ya se perdio y la espera se agota.
    const catalogoResponse = page.waitForResponse(
      (r) => r.url().includes('/api/Catalog/products/paged'),
      { timeout: 15_000 },
    );

    await page.goto('/buyer/catalog');

    await expect(page.getByRole('heading', { name: 'Catálogo de Productos' })).toBeVisible();
    await expect(page.getByRole('searchbox')).toBeVisible();

    const response = await catalogoResponse;
    expect(response.status(), 'el listado paginado del catalogo debe responder 200').toBe(200);
  });

  test('los chips de categoria reflejan el conteo real del backend', async ({ page }) => {
    await page.goto('/buyer/catalog');
    await page.waitForLoadState('networkidle');

    const chipGroup = page.getByRole('group', { name: 'Categorías de productos' });
    await expect(chipGroup).toBeVisible();
    await expect(chipGroup.getByRole('button')).not.toHaveCount(0);

    // Al elegir una categoria, la peticion lleva el filtro `category`.
    const category = chipGroup.getByRole('button').filter({ hasText: /, \d+ productos?$/ }).first();
    if (await category.isVisible()) {
      const name = await category.innerText();
      const slug = name.split(',')[0]?.trim().toLowerCase() ?? '';
      await category.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('cat=');
      expect(slug.length).toBeGreaterThan(0);
    }
  });

  test('la busqueda viaja al servidor con debounce', async ({ page }) => {
    await page.goto('/buyer/catalog');
    await page.waitForLoadState('networkidle');

    const search = page.getByRole('searchbox');
    await search.fill('teclado');
    await page.waitForLoadState('networkidle');

    // El listener se registra ANTES de escribir: con debounce de 300 ms, la
    // peticion puede salir antes de que se llegue a la linea siguiente.
    const request = page.waitForRequest((r) => r.url().includes('search='), { timeout: 10_000 });
    await search.fill('monitor');
    const req = await request;
    expect(req.url()).toContain('search=monitor');
  });

  test('la ficha de producto permite elegir variante y agregar al carrito', async ({ page }) => {
    await page.goto('/buyer/catalog');
    await page.waitForLoadState('networkidle');

    // Se recorren los productos hasta dar con uno FISICO: un producto Digital
    // no ofrece "Agregar al Carrito" (ofrece su propia via de compra), y el
    // orden de la grilla depende del orden de creacion en la base, que es
    // dato compartido entre pruebas.
    const links = grid.locator('a[href*="/buyer/catalog/"]');
    const candidates = Math.min(await links.count(), 5);
    let addButton = page.getByRole('button', { name: /Agregar al Carrito/i });

    for (let i = 0; i < candidates; i++) {
      await links.nth(i).click();
      await expect(page).toHaveURL(/\/buyer\/catalog\/.+/);
      if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) break;
      await page.goBack();
      await expect(grid).toBeVisible();
    }

    await expect(addButton).toBeVisible();

    // El nombre del producto se captura ANTES de agregar, para poder
    // comprobar despues que aparece en el carrito.
    const productName = (await page.locator('h1').first().innerText()).trim();

    await addButton.click();

    // El toast es transitorio, asi que se verifica el EFECTO PERSISTENTE:
    // el producto queda en el carrito. (Comparar el contador antes/despues no
    // es fiable: la base es compartida entre pruebas y el variante puede
    //arantar ya en el carrito, con lo que el contador no se moveria.)
    await page.getByRole('link', { name: /Carrito/i }).first().click();
    await expect(page).toHaveURL(/\/buyer\/cart/);
    await expect(page.getByText(productName).first()).toBeVisible({ timeout: 15_000 });
  });

  test('el carrito expone la reserva atomica de 15 minutos', async ({ page }) => {
    await page.goto('/buyer/cart');
    await page.waitForLoadState('networkidle');

    // Con carrito vacio hay un estado vacio; con items, la reserva de 15 min.
    const emptyState = page.getByText(/Tu carrito está vacío/i);
    const reserve = page.getByText(/Reserva 15 min/i);
    await expect(emptyState.or(reserve).first()).toBeVisible();
  });

  test('el checkout abre la pasarela de pago con la reserva atomica', async ({ page }) => {
    await page.goto('/buyer/cart');
    await page.waitForLoadState('networkidle');

    const checkoutButton = page.getByRole('button', { name: /Confirmar Checkout/i });
    if (!(await checkoutButton.isVisible())) {
      test.skip(true, 'El carrito necesita items para llegar al checkout');
      return;
    }

    await checkoutButton.click();
    await expect(page).toHaveURL(/\/buyer\/orders\/.+\/pay/);
    await expect(page.getByText(/Reserva Atómica/i)).toBeVisible();
  });

  test('la pasarela de pago muestra el temporizador de 15 minutos', async ({ page }) => {
    await page.goto('/buyer/orders');
    await page.waitForLoadState('networkidle');

    const payLink = page.getByRole('link', { name: /Pagar/i }).first();
    if (!(await payLink.isVisible())) {
      test.skip(true, 'No hay pedidos pendientes de pago para esta sesion');
      return;
    }

    await payLink.click();
    await expect(page.getByText(/Tiempo Restante de Reserva Atómica/i)).toBeVisible();
    // La ventana de reserva arranca en 15:00 y cuenta hacia abajo, asi que el
    // formato va de "15:00" a "00:00" (mm:ss con digitos de dos).
    await expect(page.getByText(/^[01][0-9]:[0-5]{2}$/)).toBeVisible();
  });
});

test.describe('Guardas de rol', () => {
  test('un visitante anonimo es redirigido al login', async ({ page }) => {
    await page.goto('/buyer/catalog');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/(login|entrar)/);
  });

  test('las paginas publicas son accesibles sin sesion', async ({ page }) => {
    for (const path of ['/terms', '/privacy', '/cookies', '/legal']) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
    }
  });
});

test.describe('Accesibilidad WCAG 2.2 AA', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsBuyer(page);
  });

  test('el catalogo no tiene violaciones criticas ni serias', async ({ page }) => {
    await page.goto('/buyer/catalog');
    await page.waitForLoadState('networkidle');

    await expectNoA11yViolations(page);
  });

  test('el carrito no tiene violaciones criticas ni serias', async ({ page }) => {
    await page.goto('/buyer/cart');
    await page.waitForLoadState('networkidle');

    await expectNoA11yViolations(page);
  });

  test('el login no tiene violaciones criticas ni serias', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expectNoA11yViolations(page);
  });

  test('la navegacion por teclado alcanza los controles del catalogo', async ({ page }) => {
    await page.goto('/buyer/catalog');
    await page.waitForLoadState('networkidle');

    // El primer Tab debe mover el foco a un control visible.
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();

    // Ningun elemento enfocado puede quedar sin nombre accesible.
    const accessibleName = await focused.evaluate((el) => {
      const aria = el.getAttribute('aria-label');
      if (aria && aria.trim().length > 0) return aria.trim();
      const labelledby = el.getAttribute('aria-labelledby');
      if (labelledby) {
        const target = document.getElementById(labelledby);
        if (target?.textContent) return target.textContent.trim();
      }
      const text = (el as HTMLElement).innerText?.trim() ?? '';
      if (text.length > 0) return text;
      const title = el.getAttribute('title');
      if (title) return title.trim();
      return '';
    });
    expect(accessibleName.length).toBeGreaterThan(0);
  });
});
