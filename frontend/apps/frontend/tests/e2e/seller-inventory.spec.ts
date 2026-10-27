import { test, expect, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Mock Data Fixtures
 */
const MOCK_SELLER_USER = {
  userId: '00000000-0000-0000-0000-000000000001',
  email: 'seller@zentric.local',
  fullName: 'Vendedor Local',
  role: 'Seller',
};

const MOCK_WAREHOUSES = [
  {
    id: 'wh-1',
    name: 'Bodega Central',
    location: 'Santiago',
    type: 'Marketplace',
    isActive: true,
  },
  {
    id: 'wh-2',
    name: 'Bodega Norte',
    location: 'Antofagasta',
    type: 'SellerOwned',
    isActive: true,
  },
];

const MOCK_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Laptop Gamer Pro',
    category: 'Electrónica',
    variants: [
      {
        id: 'var-lap-1',
        sku: 'LAP-001',
        attributes: { color: 'Negro' },
        priceAmount: 1200,
      },
    ],
  },
  {
    id: 'prod-2',
    name: 'Mouse Inalámbrico',
    category: 'Accesorios',
    variants: [
      {
        id: 'var-mou-2',
        sku: 'MOU-002',
        attributes: { color: 'Gris' },
        priceAmount: 35,
      },
    ],
  },
  {
    id: 'prod-3',
    name: 'Teclado Mecánico',
    category: 'Accesorios',
    variants: [
      {
        id: 'var-tec-3',
        sku: 'TEC-003',
        attributes: { switches: 'Red' },
        priceAmount: 75,
      },
    ],
  },
];

const MOCK_INVENTORY_ITEMS = [
  {
    id: 'inv-1',
    productId: 'prod-1',
    productName: 'Laptop Gamer Pro',
    sku: 'LAP-001',
    variantId: 'var-lap-1',
    warehouseId: 'wh-1',
    availableQuantity: 10,
    reservedQuantity: 2,
    usedQuantity: 1,
    damagedQuantity: 0,
    unitCost: 800,
    updatedAt: '2026-10-27T00:00:00Z',
  },
  {
    id: 'inv-2',
    productId: 'prod-2',
    productName: 'Mouse Inalámbrico',
    sku: 'MOU-002',
    variantId: 'var-mou-2',
    warehouseId: 'wh-2',
    availableQuantity: 3,
    reservedQuantity: 0,
    usedQuantity: 0,
    damagedQuantity: 0,
    unitCost: 15,
    updatedAt: '2026-10-27T00:00:00Z',
  },
  {
    id: 'inv-3',
    productId: 'prod-3',
    productName: 'Teclado Mecánico',
    sku: 'TEC-003',
    variantId: 'var-tec-3',
    warehouseId: 'wh-1',
    availableQuantity: 0,
    reservedQuantity: 0,
    usedQuantity: 0,
    damagedQuantity: 0,
    unitCost: 40,
    updatedAt: '2026-10-27T00:00:00Z',
  },
];

/**
 * Setup Seller authentication session and baseline routes
 */
async function setupSellerSession(page: Page) {
  await page.addInitScript(([user]) => {
    window.localStorage.setItem('zentric.auth.token', 'mock-seller-jwt-token');
    window.localStorage.setItem('zentric.auth.user', JSON.stringify(user));
    window.localStorage.setItem('zentric.theme', 'dark');
  }, [MOCK_SELLER_USER]);

  await page.route('**/api/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SELLER_USER),
    });
  });

  await page.route('**/api/Warehouses*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_WAREHOUSES),
    });
  });

  await page.route('**/api/Catalog/products/paged*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: MOCK_PRODUCTS,
        totalItems: MOCK_PRODUCTS.length,
        totalPages: 1,
        page: 1,
        size: 20,
      }),
    });
  });
}

/**
 * Helper to assert zero serious/critical WCAG 2.2 AA accessibility violations within the Seller Inventory main page
 */
async function assertNoA11yViolations(page: Page, stateName: string) {
  // Wait for CSS animations & transitions to settle
  await page.evaluate(async () => {
    const anims = typeof document.getAnimations === 'function' ? document.getAnimations() : [];
    const transitions = anims.filter((a): a is CSSTransition => a instanceof CSSTransition);
    await Promise.all(transitions.map((t) => t.finished.catch(() => undefined)));
  }).catch(() => undefined);

  const results = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const blockingViolations = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );

  expect(
    blockingViolations,
    `[A11y] Estado "${stateName}" tiene ${blockingViolations.length} violaciones serias/críticas:\n` +
      blockingViolations.map((v) => `  - [${v.impact}] ${v.id}: ${v.help} (${v.helpUrl})`).join('\n')
  ).toEqual([]);
}

test.describe('Seller Inventory - Stock View by Warehouse', () => {
  test('loads inventory items with product name, SKU, warehouse, status badges and stock quantities', async ({ page }) => {
    await setupSellerSession(page);

    await page.route('**/api/Inventories*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: MOCK_INVENTORY_ITEMS,
          totalItems: MOCK_INVENTORY_ITEMS.length,
          totalPages: 1,
          page: 1,
          size: 20,
        }),
      });
    });

    await page.goto('/seller/inventory');

    // Header title and count badge
    await expect(page.getByRole('heading', { name: 'Existencias y Abastecimiento' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('3 Posiciones')).toBeVisible();

    // Table presence
    const table = page.getByRole('table', { name: 'Inventario de productos por almacén' });
    await expect(table).toBeVisible();

    // Row 1: Laptop Gamer Pro (Available 10 -> En Stock)
    const row1 = table.getByRole('row', { name: /Laptop Gamer Pro/i });
    await expect(row1).toBeVisible();
    await expect(row1.getByText('SKU: LAP-001')).toBeVisible();
    await expect(row1.getByText(/Bodega Central/i)).toBeVisible();
    await expect(row1.getByText('En Stock')).toBeVisible();
    await expect(row1.getByRole('cell', { name: '10' })).toBeVisible();

    // Row 2: Mouse Inalámbrico (Available 3 -> Bajo Stock)
    const row2 = table.getByRole('row', { name: /Mouse Inalámbrico/i });
    await expect(row2).toBeVisible();
    await expect(row2.getByText('SKU: MOU-002')).toBeVisible();
    await expect(row2.getByText(/Bodega Norte/i)).toBeVisible();
    await expect(row2.getByText('Bajo Stock')).toBeVisible();
    await expect(row2.getByRole('cell', { name: '3' })).toBeVisible();

    // Row 3: Teclado Mecánico (Available 0 -> Agotado)
    const row3 = table.getByRole('row', { name: /Teclado Mecánico/i });
    await expect(row3).toBeVisible();
    await expect(row3.getByText('SKU: TEC-003')).toBeVisible();
    await expect(row3.getByText('Agotado')).toBeVisible();
    await expect(row3.getByRole('cell', { name: '0' }).first()).toBeVisible();
  });
});

test.describe('Seller Inventory - Search and Warehouse Filter', () => {
  test('filters inventory by search query with debounce', async ({ page }) => {
    await setupSellerSession(page);

    let capturedSearchParam = '';
    await page.route('**/api/Inventories*', async (route: Route) => {
      const url = new URL(route.request().url());
      capturedSearchParam = url.searchParams.get('search') ?? '';

      const items = capturedSearchParam
        ? MOCK_INVENTORY_ITEMS.filter((i) =>
            i.productName.toLowerCase().includes(capturedSearchParam.toLowerCase()) ||
            i.sku.toLowerCase().includes(capturedSearchParam.toLowerCase())
          )
        : MOCK_INVENTORY_ITEMS;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items,
          totalItems: items.length,
          totalPages: 1,
          page: 1,
          size: 20,
        }),
      });
    });

    await page.goto('/seller/inventory');
    const table = page.getByRole('table', { name: 'Inventario de productos por almacén' });
    await expect(table).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByRole('textbox', { name: 'Buscar por producto o SKU' });
    await searchInput.fill('Laptop');

    // Wait for debounced search request: only Laptop remains in table
    await expect(table.getByText('Mouse Inalámbrico')).not.toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('Laptop Gamer Pro')).toBeVisible();
    expect(capturedSearchParam).toBe('Laptop');
  });

  test('filters inventory by warehouse dropdown', async ({ page }) => {
    await setupSellerSession(page);

    let capturedWarehouseParam = '';
    await page.route('**/api/Inventories*', async (route: Route) => {
      const url = new URL(route.request().url());
      capturedWarehouseParam = url.searchParams.get('warehouseId') ?? '';

      const items = capturedWarehouseParam
        ? MOCK_INVENTORY_ITEMS.filter((i) => i.warehouseId === capturedWarehouseParam)
        : MOCK_INVENTORY_ITEMS;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items,
          totalItems: items.length,
          totalPages: 1,
          page: 1,
          size: 20,
        }),
      });
    });

    await page.goto('/seller/inventory');
    const table = page.getByRole('table', { name: 'Inventario de productos por almacén' });
    await expect(table).toBeVisible({ timeout: 15_000 });

    const warehouseSelect = page.getByRole('combobox', { name: 'Filtrar por bodega' });
    await warehouseSelect.selectOption('wh-2');

    // Only Mouse Inalámbrico is in wh-2
    await expect(table.getByText('Laptop Gamer Pro')).not.toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('Mouse Inalámbrico')).toBeVisible();
    expect(capturedWarehouseParam).toBe('wh-2');
  });

  test('clears filters when no items match and user clicks Limpiar filtros', async ({ page }) => {
    await setupSellerSession(page);

    await page.route('**/api/Inventories*', async (route: Route) => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search');

      if (search === 'Inexistente') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [],
            totalItems: 0,
            totalPages: 0,
            page: 1,
            size: 20,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: MOCK_INVENTORY_ITEMS,
            totalItems: MOCK_INVENTORY_ITEMS.length,
            totalPages: 1,
            page: 1,
            size: 20,
          }),
        });
      }
    });

    await page.goto('/seller/inventory');
    const table = page.getByRole('table', { name: 'Inventario de productos por almacén' });
    await expect(table).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByRole('textbox', { name: 'Buscar por producto o SKU' });
    await searchInput.fill('Inexistente');

    // StateView empty filter view appears
    await expect(page.getByText('No hay inventarios que coincidan con los filtros aplicados.')).toBeVisible({ timeout: 10_000 });
    const clearFiltersBtn = page.getByRole('button', { name: 'Limpiar filtros' });
    await expect(clearFiltersBtn).toBeVisible();

    await clearFiltersBtn.click();
    await expect(page.getByRole('table', { name: 'Inventario de productos por almacén' })).toBeVisible();
    await expect(searchInput).toHaveValue('');
  });
});

test.describe('Seller Inventory - Pagination', () => {
  test('navigates between pages of inventory records', async ({ page }) => {
    await setupSellerSession(page);

    const page1Items = [MOCK_INVENTORY_ITEMS[0], MOCK_INVENTORY_ITEMS[1]];
    const page2Items = [MOCK_INVENTORY_ITEMS[2]];

    let currentPageRequested = 1;
    await page.route('**/api/Inventories*', async (route: Route) => {
      const url = new URL(route.request().url());
      const pageNum = Number(url.searchParams.get('page') ?? '1');
      currentPageRequested = pageNum;

      const items = pageNum === 2 ? page2Items : page1Items;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items,
          totalItems: 3,
          totalPages: 2,
          page: pageNum,
          size: 2,
        }),
      });
    });

    await page.goto('/seller/inventory');
    const table = page.getByRole('table', { name: 'Inventario de productos por almacén' });
    await expect(table.getByText('Laptop Gamer Pro')).toBeVisible({ timeout: 15_000 });

    // Pagination controls visible
    const paginationNav = page.getByRole('navigation', { name: 'Paginación' });
    await expect(paginationNav).toBeVisible();
    await expect(paginationNav.getByText(/Página 1 de 2/i)).toBeVisible();

    // Click "Siguiente"
    const nextBtn = paginationNav.getByRole('button', { name: 'Siguiente' });
    await nextBtn.click();

    // Assert page 2 content rendered
    await expect(table.getByText('Teclado Mecánico')).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('Laptop Gamer Pro')).not.toBeVisible();
    expect(currentPageRequested).toBe(2);

    // Click "Anterior" to go back to page 1
    const prevBtn = paginationNav.getByRole('button', { name: 'Anterior' });
    await prevBtn.click();

    await expect(table.getByText('Laptop Gamer Pro')).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('Teclado Mecánico')).not.toBeVisible();
    await expect(paginationNav.getByText(/Página 1 de 2/i)).toBeVisible();
  });
});

test.describe('Seller Inventory - Add Stock', () => {
  test('displays validation error and does not dispatch request when variant is empty', async ({ page }) => {
    await setupSellerSession(page);

    let stockRequestSent = false;
    await page.route('**/api/Inventories/stock', async (route: Route) => {
      stockRequestSent = true;
      await route.fulfill({ status: 200, body: JSON.stringify('new-id') });
    });

    await page.route('**/api/Inventories*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], totalItems: 0, totalPages: 0, page: 1, size: 20 }),
      });
    });

    await page.goto('/seller/inventory');
    await expect(page.getByRole('heading', { name: 'Ingreso de Stock' })).toBeVisible({ timeout: 15_000 });

    // Ensure variant is cleared
    await page.locator('#target-variant-id').fill('');
    await page.getByRole('button', { name: /Ingresar Existencias/i }).click();

    await expect(page.getByText('Debe especificar el identificador de la variante.')).toBeVisible();
    expect(stockRequestSent).toBe(false);
  });

  test('displays validation error and does not dispatch request when warehouse is not selected', async ({ page }) => {
    await setupSellerSession(page);

    let stockRequestSent = false;
    await page.route('**/api/Inventories/stock', async (route: Route) => {
      stockRequestSent = true;
      await route.fulfill({ status: 200, body: JSON.stringify('new-id') });
    });

    await page.route('**/api/Inventories*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], totalItems: 0, totalPages: 0, page: 1, size: 20 }),
      });
    });

    await page.goto('/seller/inventory');
    await expect(page.getByRole('heading', { name: 'Ingreso de Stock' })).toBeVisible({ timeout: 15_000 });

    // Fill variant but select default empty warehouse
    await page.locator('#target-variant-id').fill('var-lap-1');
    await page.locator('#target-warehouse-select').selectOption('');

    await page.getByRole('button', { name: /Ingresar Existencias/i }).click();

    await expect(page.getByText('Debe seleccionar una bodega de destino.')).toBeVisible();
    expect(stockRequestSent).toBe(false);
  });

  test('displays validation error and blocks dispatch for decimal quantity like "2.5"', async ({ page }) => {
    await setupSellerSession(page);

    let stockRequestSent = false;
    await page.route('**/api/Inventories/stock', async (route: Route) => {
      stockRequestSent = true;
      await route.fulfill({ status: 200, body: JSON.stringify('new-id') });
    });

    await page.route('**/api/Inventories*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], totalItems: 0, totalPages: 0, page: 1, size: 20 }),
      });
    });

    await page.goto('/seller/inventory');
    await expect(page.getByRole('heading', { name: 'Ingreso de Stock' })).toBeVisible({ timeout: 15_000 });

    await page.locator('#target-variant-id').fill('var-lap-1');
    await page.locator('#target-warehouse-select').selectOption('wh-1');
    await page.locator('#stock-quantity').fill('2.5');

    await page.getByRole('button', { name: /Ingresar Existencias/i }).click();

    await expect(page.getByText('La cantidad debe ser un número entero sin decimales.')).toBeVisible();
    expect(stockRequestSent).toBe(false);
  });

  test('displays validation error and blocks dispatch for non-positive or empty quantity', async ({ page }) => {
    await setupSellerSession(page);

    let stockRequestSent = false;
    await page.route('**/api/Inventories/stock', async (route: Route) => {
      stockRequestSent = true;
      await route.fulfill({ status: 200, body: JSON.stringify('new-id') });
    });

    await page.route('**/api/Inventories*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], totalItems: 0, totalPages: 0, page: 1, size: 20 }),
      });
    });

    await page.goto('/seller/inventory');
    await expect(page.getByRole('heading', { name: 'Ingreso de Stock' })).toBeVisible({ timeout: 15_000 });

    await page.locator('#target-variant-id').fill('var-lap-1');
    await page.locator('#target-warehouse-select').selectOption('wh-1');

    // Test empty quantity
    await page.locator('#stock-quantity').fill('');
    await page.getByRole('button', { name: /Ingresar Existencias/i }).click();
    await expect(page.getByText('Debe ingresar la cantidad de unidades.')).toBeVisible();
    expect(stockRequestSent).toBe(false);

    // Test zero quantity
    await page.locator('#stock-quantity').fill('0');
    await page.getByRole('button', { name: /Ingresar Existencias/i }).click();
    await expect(page.getByText(/La cantidad a ingresar debe ser mayor que cero/i)).toBeVisible();
    expect(stockRequestSent).toBe(false);
  });

  test('submits valid integer stock addition, calls API, updates/clears form', async ({ page }) => {
    await setupSellerSession(page);

    let dispatchedPayload: Record<string, unknown> | null = null;
    await page.route('**/api/Inventories/stock', async (route: Route) => {
      dispatchedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify('f3c7e7b5-0000-0000-0000-000000000001'),
      });
    });

    await page.route('**/api/Inventories*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], totalItems: 0, totalPages: 0, page: 1, size: 20 }),
      });
    });

    await page.goto('/seller/inventory');
    await expect(page.getByRole('heading', { name: 'Ingreso de Stock' })).toBeVisible({ timeout: 15_000 });

    // Fill form with valid data
    await page.locator('#target-variant-select').selectOption('var-lap-1');
    await page.locator('#target-warehouse-select').selectOption('wh-1');
    await page.locator('#stock-quantity').fill('25');

    await page.getByRole('button', { name: /Ingresar Existencias/i }).click();

    // Verify API call payload
    expect(dispatchedPayload).toEqual({
      variantId: 'var-lap-1',
      warehouseId: 'wh-1',
      quantity: 25,
    });

    // Verify success banner and form quantity reset
    await expect(page.getByText('Ingreso de 25 unidades registrado exitosamente.')).toBeVisible();
    await expect(page.locator('#stock-quantity')).toHaveValue('1');
  });
});

test.describe('Seller Inventory - Delete Inventory Flow', () => {
  test('disables delete button for records with physical stock (> 0)', async ({ page }) => {
    await setupSellerSession(page);

    await page.route('**/api/Inventories*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: MOCK_INVENTORY_ITEMS,
          totalItems: MOCK_INVENTORY_ITEMS.length,
          totalPages: 1,
          page: 1,
          size: 20,
        }),
      });
    });

    await page.goto('/seller/inventory');
    await expect(page.getByRole('table', { name: 'Inventario de productos por almacén' })).toBeVisible({ timeout: 15_000 });

    // inv-1 has physical stock (10 available + 2 reserved + 1 used = 13 > 0)
    const deleteBtnInv1 = page.getByRole('button', {
      name: /Eliminar inventario de Laptop Gamer Pro/i,
    });
    await expect(deleteBtnInv1).toBeVisible();
    await expect(deleteBtnInv1).toBeDisabled();

    // inv-2 has physical stock (3 available > 0)
    const deleteBtnInv2 = page.getByRole('button', {
      name: /Eliminar inventario de Mouse Inalámbrico/i,
    });
    await expect(deleteBtnInv2).toBeVisible();
    await expect(deleteBtnInv2).toBeDisabled();
  });

  test('allows deleting a 0-stock record with confirmation modal and displays result alert in table context', async ({ page }) => {
    await setupSellerSession(page);

    let deleteRequested = false;
    let deletedId = '';
    await page.route('**/api/Inventories/*', async (route: Route) => {
      if (route.request().method() === 'DELETE') {
        deleteRequested = true;
        const urlParts = route.request().url().split('/');
        deletedId = urlParts[urlParts.length - 1] ?? '';
        await route.fulfill({ status: 204 });
      } else {
        await route.fallback();
      }
    });

    await page.route('**/api/Inventories*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: MOCK_INVENTORY_ITEMS,
          totalItems: MOCK_INVENTORY_ITEMS.length,
          totalPages: 1,
          page: 1,
          size: 20,
        }),
      });
    });

    await page.goto('/seller/inventory');
    await expect(page.getByRole('table', { name: 'Inventario de productos por almacén' })).toBeVisible({ timeout: 15_000 });

    // inv-3 has 0 physical stock: button is enabled
    const deleteBtnInv3 = page.getByRole('button', {
      name: /Eliminar inventario de Teclado Mecánico/i,
    });
    await expect(deleteBtnInv3).toBeVisible();
    await expect(deleteBtnInv3).toBeEnabled();

    // Click delete to trigger confirmation modal
    await deleteBtnInv3.click();

    // Modal dialog appears
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Eliminar registro de inventario')).toBeVisible();

    // Confirm deletion
    const confirmBtn = dialog.getByRole('button', { name: 'Eliminar' });
    await confirmBtn.click();

    // Assert DELETE was sent for inv-3
    expect(deleteRequested).toBe(true);
    expect(deletedId).toBe('inv-3');

    // Assert table-context success alert
    await expect(
      page.getByText('Registro de inventario de "Teclado Mecánico" eliminado.')
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Seller Inventory - Deep-Linking by VariantId', () => {
  test('prefills form and highlights row when variantId query param is present in URL', async ({ page }) => {
    await setupSellerSession(page);

    await page.route('**/api/Inventories*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: MOCK_INVENTORY_ITEMS,
          totalItems: MOCK_INVENTORY_ITEMS.length,
          totalPages: 1,
          page: 1,
          size: 20,
        }),
      });
    });

    // Navigate with deep-link variantId=var-lap-1
    await page.goto('/seller/inventory?variantId=var-lap-1');
    await expect(page.getByRole('table', { name: 'Inventario de productos por almacén' })).toBeVisible({ timeout: 15_000 });

    // Form inputs prefilled with variant
    await expect(page.locator('#target-variant-id')).toHaveValue('var-lap-1');
    await expect(page.locator('#target-variant-select')).toHaveValue('var-lap-1');

    // Table row highlighted with presence badge and aria-selected
    const table = page.getByRole('table', { name: 'Inventario de productos por almacén' });
    const highlightedRow = table.getByRole('row', { name: /Laptop Gamer Pro/i });
    await expect(highlightedRow).toHaveAttribute('aria-selected', 'true');
    await expect(highlightedRow.getByText('↑ Presencia')).toBeVisible();
  });

  test('clicking Limpiar resets input without re-trapping to the URL parameter', async ({ page }) => {
    await setupSellerSession(page);

    await page.route('**/api/Inventories*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: MOCK_INVENTORY_ITEMS,
          totalItems: MOCK_INVENTORY_ITEMS.length,
          totalPages: 1,
          page: 1,
          size: 20,
        }),
      });
    });

    await page.goto('/seller/inventory?variantId=var-lap-1');
    await expect(page.locator('#target-variant-id')).toHaveValue('var-lap-1', { timeout: 15_000 });

    // Click "Limpiar" button
    const clearBtn = page.getByRole('button', { name: 'Limpiar' });
    await clearBtn.click();

    // Inputs are reset
    await expect(page.locator('#target-variant-id')).toHaveValue('');
    await expect(page.locator('#target-variant-select')).toHaveValue('');
    await expect(page.locator('#stock-quantity')).toHaveValue('1');

    // Typing a new variant ID does not snap back to URL parameter
    await page.locator('#target-variant-id').fill('var-custom-999');
    await expect(page.locator('#target-variant-id')).toHaveValue('var-custom-999');
  });
});

test.describe('Seller Inventory - Automated Axe Accessibility Scans (WCAG 2.2 AA)', () => {
  test('a) Default state: zero serious or critical accessibility violations', async ({ page }) => {
    await setupSellerSession(page);

    await page.route('**/api/Inventories*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: MOCK_INVENTORY_ITEMS,
          totalItems: MOCK_INVENTORY_ITEMS.length,
          totalPages: 1,
          page: 1,
          size: 20,
        }),
      });
    });

    await page.goto('/seller/inventory');
    const table = page.getByRole('table', { name: 'Inventario de productos por almacén' });
    await expect(table).toBeVisible({ timeout: 15_000 });
    await expect(table.getByText('Laptop Gamer Pro')).toBeVisible();

    await assertNoA11yViolations(page, 'Default State (Table Populated)');
  });

  test('b) Empty state: zero serious or critical accessibility violations', async ({ page }) => {
    await setupSellerSession(page);

    await page.route('**/api/Inventories*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          totalItems: 0,
          totalPages: 0,
          page: 1,
          size: 20,
        }),
      });
    });

    await page.goto('/seller/inventory');
    await expect(page.getByText('No hay existencias registradas')).toBeVisible({ timeout: 15_000 });

    await assertNoA11yViolations(page, 'Empty State (No Inventories)');
  });

  test('c) Error state: zero serious or critical accessibility violations', async ({ page }) => {
    await setupSellerSession(page);

    await page.route('**/api/Inventories*', async (route: Route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Error interno al consultar existencias' }),
      });
    });

    await page.goto('/seller/inventory');
    await expect(page.getByText('Error al cargar el inventario')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /Reintentar/i })).toBeVisible();

    await assertNoA11yViolations(page, 'Error State (Server Error Alert)');
  });

  test('d) Form validation state: zero serious or critical accessibility violations', async ({ page }) => {
    await setupSellerSession(page);

    await page.route('**/api/Inventories*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: MOCK_INVENTORY_ITEMS,
          totalItems: MOCK_INVENTORY_ITEMS.length,
          totalPages: 1,
          page: 1,
          size: 20,
        }),
      });
    });

    await page.goto('/seller/inventory');
    const table = page.getByRole('table', { name: 'Inventario de productos por almacén' });
    await expect(table).toBeVisible({ timeout: 15_000 });

    // Trigger form validation error on aside form
    await page.locator('#target-variant-id').fill('');
    await page.getByRole('button', { name: /Ingresar Existencias/i }).click();

    await expect(page.getByText('Debe especificar el identificador de la variante.')).toBeVisible();

    await assertNoA11yViolations(page, 'Form Validation State (Error Alert Visible)');
  });
});
