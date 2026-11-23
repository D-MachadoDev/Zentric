import { test, expect } from '@playwright/test';
import { USERS, SESSION_TOKEN_KEY } from './support/auth';

/**
 * Suite E2E de Acceso Corporativo B2B (/acceso-corporativo)
 * Validación de estaciones RBAC, consentimiento legal, visibilidad accesible,
 * rechazo real por API, Boundary Enforcement y cadenas de navegación protegidas.
 */
test.describe('Acceso Corporativo B2B (E2E contra PostgreSQL + .NET 10)', () => {
  test('Flujo 1: Validación cliente bloquea el acceso si no se aceptan los términos operativos y de confidencialidad', async ({ page }) => {
    let networkCallMade = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/login')) {
        networkCallMade = true;
      }
    });

    await page.goto('/acceso-corporativo', { waitUntil: 'domcontentloaded' });

    // Desmarcamos el primer checkbox de términos operativos
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(termsCheckbox).toBeChecked();
    await termsCheckbox.uncheck();
    await expect(termsCheckbox).not.toBeChecked();

    // Intentamos enviar el formulario
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Validamos que el cliente bloquea la salida y muestra el mensaje legal en el DOM
    await expect(
      page.getByText(/Debe aceptar los Términos de Operación y la Política de Confidencialidad/i),
    ).toBeVisible();

    // Comprobamos empíricamente que jamás viajó ninguna petición a la API
    expect(networkCallMade).toBe(false);
  });

  test('Flujo 2: Conmutación interactiva entre estaciones RBAC (Vendedor, Logística, Supervisión, Admin)', async ({ page }) => {
    await page.goto('/acceso-corporativo', { waitUntil: 'domcontentloaded' });

    // 1. Estación Vendedor (por defecto)
    const container = page.locator('[data-role]').first();
    await expect(container).toHaveAttribute('data-role', 'seller');
    await expect(page.getByRole('heading', { name: /Consola de Socios · Seller Central/i })).toBeVisible();

    // 2. Conmutar a Logística
    const logisticsTab = page.getByRole('tab', { name: /Logística/i });
    await logisticsTab.click();
    await expect(container).toHaveAttribute('data-role', 'logistics');
    await expect(page.getByRole('heading', { name: /Muelle & Centro de Operaciones/i })).toBeVisible();
    await expect(page.locator('#corp-email')).toHaveValue(USERS.logistics.email);

    // 3. Conmutar a Supervisión
    const supervisorTab = page.getByRole('tab', { name: /Supervisión/i });
    await supervisorTab.click();
    await expect(container).toHaveAttribute('data-role', 'supervisor');
    await expect(page.getByRole('heading', { name: /Fiscalización & Auditoría 360°/i })).toBeVisible();
    await expect(page.locator('#corp-email')).toHaveValue(USERS.supervisor.email);

    // 4. Conmutar a Admin
    const adminTab = page.getByRole('tab', { name: /Admin/i });
    await adminTab.click();
    await expect(container).toHaveAttribute('data-role', 'admin');
    await expect(page.getByRole('heading', { name: /Gobierno Corporativo & RBAC/i })).toBeVisible();
    await expect(page.locator('#corp-email')).toHaveValue(USERS.admin.email);
  });

  test('Flujo 3: Toggle de visibilidad de contraseña (PasswordInput accesible WCAG 2.2 AA)', async ({ page }) => {
    await page.goto('/acceso-corporativo', { waitUntil: 'domcontentloaded' });

    const passwordInput = page.locator('#corp-password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Botón de alternar visibilidad
    const toggleBtn = page.getByRole('button', { name: /Mostrar contraseña/i });
    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');

    // Clic para revelar
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: /Ocultar contraseña/i })).toBeVisible();

    // Clic para ocultar nuevamente
    await page.getByRole('button', { name: /Ocultar contraseña/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(page.getByRole('button', { name: /Mostrar contraseña/i })).toBeVisible();
  });

  test('Flujo 4: Rechazo real en backend ante credenciales corporativas erróneas (HTTP 401)', async ({ page }) => {
    await page.goto('/acceso-corporativo', { waitUntil: 'domcontentloaded' });

    await page.locator('#corp-email').fill(USERS.seller.email);
    await page.locator('#corp-password').fill('ContrasenaInvalidaTotalmente999!');

    // Disparamos clic y esperamos la respuesta HTTP real de .NET 10
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'),
      page.locator('button[type="submit"]').click(),
    ]);

    expect(response.status()).toBe(401);

    // Validamos alerta visible en la interfaz
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/El correo o la contraseña no son correctos|Invalid email or password/i);

    // Verificamos que la URL permanece en /acceso-corporativo
    expect(page.url()).toContain('/acceso-corporativo');
  });

  test('Flujo 5: Boundary Enforcement Real — Comprador B2C es interceptado en la estación corporativa con salto seguro a /login', async ({ page }) => {
    await page.goto('/acceso-corporativo', { waitUntil: 'domcontentloaded' });

    // Ingresamos credenciales legítimas de un Comprador
    await page.locator('#corp-email').fill(USERS.buyer.email);
    await page.locator('#corp-password').fill(USERS.buyer.password);

    // Enviamos el formulario y capturamos respuesta 200 de la API
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'),
      page.locator('button[type="submit"]').click(),
    ]);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.role).toBe('Buyer');

    // Verificamos que el Boundary Enforcement bloqueó la entrada corporativa
    const boundaryNotice = page.getByRole('alert');
    await expect(boundaryNotice).toBeVisible();
    await expect(boundaryNotice).toContainText(/Cuenta de Comprador detectada/i);
    await expect(page.url()).toContain('/acceso-corporativo');

    // Clic en el botón de salto hacia el portal de Compradores
    const jumpBtn = page.getByRole('button', { name: /Ir al Portal de Compradores/i });
    await expect(jumpBtn).toBeVisible();
    await jumpBtn.click();

    // Como las credenciales autenticaron al Comprador en sesión, el guard de /login
    // lo canaliza automáticamente hacia el Marketplace (/) sin exponer el formulario de login
    await expect(page).toHaveURL(/localhost:15434\/?$/);
  });

  test('Flujo 6: Cadena completa real de Vendedor — Acceso a Consola de Socios (/seller)', async ({ page }) => {
    await page.goto('/acceso-corporativo', { waitUntil: 'domcontentloaded' });

    // Seleccionamos estación Vendedor y aseguramos credenciales de Vendedor
    await page.getByRole('tab', { name: /Vendedor/i }).click();
    await page.locator('#corp-email').fill(USERS.seller.email);
    await page.locator('#corp-password').fill(USERS.seller.password);

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'),
      page.locator('button[type="submit"]').click(),
    ]);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.role).toBe('Seller');

    // Verificamos navegación a la consola de vendedor
    await page.waitForURL(/\/seller/);
    expect(page.url()).toContain('/seller');

    const storedToken = await page.evaluate((key) => window.localStorage.getItem(key), SESSION_TOKEN_KEY);
    expect(storedToken).toBe(body.token);
  });

  test('Flujo 7: Cadena completa real de Logística — Acceso a Muelle de Operaciones (/logistics/fulfillments)', async ({ page }) => {
    await page.goto('/acceso-corporativo', { waitUntil: 'domcontentloaded' });

    // Conmutamos a estación Logística
    await page.getByRole('tab', { name: /Logística/i }).click();
    await page.locator('#corp-email').fill(USERS.logistics.email);
    await page.locator('#corp-password').fill(USERS.logistics.password);

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'),
      page.locator('button[type="submit"]').click(),
    ]);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.role).toBe('LogisticsOperator');

    // Verificamos navegación a la estación de fulfillments
    await page.waitForURL(/\/logistics/);
    expect(page.url()).toContain('/logistics');
  });

  test('Flujo 8: Cadena completa real de Administrador — Acceso a Gobierno Corporativo (/admin)', async ({ page }) => {
    await page.goto('/acceso-corporativo', { waitUntil: 'domcontentloaded' });

    // Conmutamos a estación Admin
    await page.getByRole('tab', { name: /Admin/i }).click();
    await page.locator('#corp-email').fill(USERS.admin.email);
    await page.locator('#corp-password').fill(USERS.admin.password);

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'),
      page.locator('button[type="submit"]').click(),
    ]);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.role).toBe('Administrator');

    // Verificamos navegación a la consola de admin
    await page.waitForURL(/\/admin/);
    expect(page.url()).toContain('/admin');
  });

  test('Flujo 9: Enlace directo al portal de Compradores navega limpiamente a /login', async ({ page }) => {
    await page.goto('/acceso-corporativo', { waitUntil: 'domcontentloaded' });

    const buyerLink = page.getByRole('link', { name: /Acceso Compradores/i });
    await expect(buyerLink).toBeVisible();
    await buyerLink.click();

    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
    await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible();
  });
});
