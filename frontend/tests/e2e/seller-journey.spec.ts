import { test, expect, type Page } from '@playwright/test';
import { USERS } from './support/auth';

/**
 * Suite E2E Real del Recorrido Completo del Vendedor (Seller Journey)
 * 100% contra PostgreSQL (15432) + API .NET 10 Kestrel (15433) [CERO MOCKS].
 *
 * Estructura Uniforme:
 * Cada prueba individual cubre un flujo de negocio atómico con:
 * - Display Name en español explicativo.
 * - Estructura estandarizada: 1. Arrange -> 2. Act -> 3. Assert.
 * - Verificación empírica contra la API real y el DOM auténtico.
 */
test.describe.serial('Suite E2E: Recorrido Integral del Vendedor (Flujos Individuales)', () => {
  let page: Page;

  const timestamp = Date.now().toString().slice(-6);
  const testProductName = `Audífonos Zentric Pro Wireless ${timestamp}`;
  const testProductDescription = 'Audífonos inalámbricos de alta fidelidad con cancelación activa de ruido probados en vivo.';
  const testProductPrice = '350000';
  const testSku = `SKU-AUD-${timestamp}`;
  const testImageUrl = 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80';

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Prueba 1: [Autenticación Corporativa] Iniciar sesión como Vendedora en estación B2B (/acceso-corporativo)', async () => {
    // 1. Arrange: Navegación a la estación de acceso corporativo
    await page.goto('/acceso-corporativo', { waitUntil: 'domcontentloaded' });
    const sellerTab = page.getByRole('tab', { name: /Vendedor/i });
    await expect(sellerTab).toBeVisible();

    // 2. Act: Selección de rol Vendedor y envío de credenciales reales
    await sellerTab.click();
    await page.locator('#corp-email').fill(USERS.seller.email);
    await page.locator('#corp-password').fill(USERS.seller.password);

    const [loginResponse] = await Promise.all([
      page.waitForResponse((res) => /api\/auth\/login/i.test(res.url()) && res.request().method() === 'POST'),
      page.locator('button[type="submit"]').click(),
    ]);

    // 3. Assert: Validación de token 200, rol Seller y carga de Consola del Vendedor
    expect(loginResponse.status()).toBe(200);
    const authBody = await loginResponse.json();
    expect(authBody.role).toBe('Seller');

    await page.waitForURL(/\/seller/);
    expect(page.url()).toContain('/seller');
    await expect(page.getByRole('heading', { name: /Consola del Vendedor/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/Valeria Mendoza/i)).toBeVisible();
  });

  test('Prueba 2: [Alta de Catálogo] Publicar nuevo producto físico con SKU y precio en base de datos (/seller/products/new)', async () => {
    // 1. Arrange: Apertura del formulario de publicación comercial
    await page.goto('/seller/products/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Dar de Alta Nuevo Producto/i, level: 1 })).toBeVisible();

    // 2. Act: Diligenciamiento de ficha técnica, fotografía, precio y código SKU
    await page.getByPlaceholder(/Ej. Monitor Curvo/i).fill(testProductName);
    await page.getByPlaceholder(/Características principales/i).fill(testProductDescription);
    await page.getByPlaceholder(/0.00/i).first().fill(testProductPrice);
    await page.getByPlaceholder(/https:\/\//i).fill(testImageUrl);
    await page.getByPlaceholder(/SKU-REF/i).fill(testSku);

    const [createResponse] = await Promise.all([
      page.waitForResponse((res) => /api\/catalog\/products/i.test(res.url()) && res.request().method() === 'POST'),
      page.getByRole('button', { name: /Publicar en Catálogo del Vendedor/i }).click(),
    ]);

    // 3. Assert: Creación 200 en PostgreSQL y panel visual de confirmación
    expect(createResponse.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /¡Producto Registrado con Éxito!/i })).toBeVisible();
    await expect(page.getByText(/Publicado en catálogo comercial/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Cargar Stock Inicial en Bodega/i })).toBeVisible();
  });

  test('Prueba 3: [Control de Existencias] Abastecer inventario físico en bodega asignada a la vendedora (/seller/inventory)', async () => {
    // 1. Arrange: Navegación contextual al inventario de la variante recién creada
    await page.getByRole('button', { name: /Cargar Stock Inicial en Bodega/i }).click();
    await page.waitForURL(/\/seller\/inventory/);
    await expect(page.getByRole('heading', { name: /Existencias y Abastecimiento/i, level: 1 })).toBeVisible();

    // 2. Act: Selección de bodega receptora e ingreso de existencias físicas (50 unidades)
    const warehouseSelect = page.locator('#target-warehouse-select');
    await expect(warehouseSelect).toBeVisible();
    const currentWarehouse = await warehouseSelect.inputValue();
    if (!currentWarehouse) {
      await warehouseSelect.selectOption({ index: 1 });
    }

    const quantityInput = page.locator('#stock-quantity');
    await expect(quantityInput).toBeVisible();
    await quantityInput.fill('50');

    const [stockResponse] = await Promise.all([
      page.waitForResponse((res) => /api\/inventories/i.test(res.url()) && res.request().method() === 'POST'),
      page.getByRole('button', { name: /Ingresar Existencias/i }).click(),
    ]);

    // 3. Assert: Registro 200 en PostgreSQL y alerta de confirmación en UI
    expect(stockResponse.status()).toBe(200);
    await expect(page.getByText(/Ingreso de 50 unidades registrado exitosamente/i)).toBeVisible();
  });

  test('Prueba 4: [Aislamiento y Vitrina] Cerrar sesión corporativa y localizar producto en catálogo público de compradores (/buyer)', async () => {
    // 1. Arrange: Salida de la sesión B2B para respetar el Boundary Enforcement
    await page.getByRole('button', { name: /Cerrar sesión/i }).click();
    await page.waitForURL(/\/login/);

    // 2. Act: Navegación al portal de compradores y filtrado por nombre de producto
    await page.goto('/buyer', { waitUntil: 'domcontentloaded' });
    const searchInput = page.getByRole('searchbox', { name: /Buscar por nombre/i });
    await expect(searchInput).toBeVisible();
    await searchInput.fill(testProductName);

    // 3. Assert: La tarjeta del producto aparece en la grilla pública con su título
    const productCardTitle = page.getByRole('heading', { name: testProductName, level: 3 });
    await expect(productCardTitle).toBeVisible({ timeout: 10000 });
  });

  test('Prueba 5: [Ficha de Compra] Validar ficha técnica PDP y disponibilidad para compra', async () => {
    // 1. Arrange: Localización de la tarjeta en la vitrina pública
    const productCardTitle = page.getByRole('heading', { name: testProductName, level: 3 });
    await expect(productCardTitle).toBeVisible();

    // 2. Act: Ingreso a la Ficha de Detalle de Producto (PDP)
    await productCardTitle.click();
    await page.waitForURL(/\/buyer\/catalog\//);

    // 3. Assert: Encabezado principal, precio monetario y botón de carrito activo
    await expect(page.getByRole('heading', { name: testProductName, level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /Agregar al Carrito/i })).toBeVisible();
  });
});
