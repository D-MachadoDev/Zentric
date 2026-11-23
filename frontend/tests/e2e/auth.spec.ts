import { test, expect } from '@playwright/test';
import { USERS, SESSION_TOKEN_KEY } from './support/auth';

test.describe('Autenticación Real de Comprador (E2E contra PostgreSQL + .NET 10)', () => {
  test('Flujo 1: Validación cliente con Zod detiene el envío si los campos están vacíos (Cero llamadas de red)', async ({ page }) => {
    let networkCallMade = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/login')) {
        networkCallMade = true;
      }
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const submitBtn = page.getByRole('button', { name: /Continuar/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Verificamos que Zod bloqueó la salida y mostró mensajes en el DOM
    await expect(page.getByText(/El correo electrónico es obligatorio/i)).toBeVisible();
    await expect(page.getByText(/La contraseña es obligatoria/i)).toBeVisible();

    // Comprobamos empíricamente que NUNCA viajó ninguna petición a la red
    expect(networkCallMade).toBe(false);
  });

  test('Flujo 2: Rechazo real en backend (PostgreSQL + PBKDF2) ante credenciales erróneas', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Escribimos credenciales con contraseña falsa
    await page.getByLabel(/Correo electrónico/i).fill(USERS.buyer.email);
    await page.getByLabel(/^Contraseña$/i).fill('ContrasenaTotalmenteErronea123!');

    // Disparamos clic y esperamos la respuesta HTTP real de .NET 10 con Promise.all
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'),
      page.getByRole('button', { name: /Continuar/i }).click(),
    ]);

    // Validamos que el backend .NET respondió HTTP 401 Unauthorized real
    expect(response.status()).toBe(401);

    const problemDetails = await response.json();
    expect(problemDetails.status).toBe(401);
    expect(problemDetails.detail).toBe('Invalid email or password.');

    // Verificamos que la pantalla muestra la alerta al usuario
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Invalid email or password/i);

    // Verificamos que la URL NO navegó y permanece en /login
    expect(page.url()).toContain('/login');
  });

  test('Flujo 3: Cadena completa real (Form -> Zod -> HttpClient -> Controller -> MediatR -> PBKDF2 -> Postgres -> JWT -> /buyer)', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // 1. Llenar el formulario con el usuario sembrado en PostgreSQL asegurando disponibilidad
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEnabled();
    await emailInput.fill(USERS.buyer.email);

    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toBeEnabled();
    await passwordInput.fill(USERS.buyer.password);

    const submitBtn = page.getByRole('button', { name: /Continuar/i });
    await expect(submitBtn).toBeEnabled();

    // 2. Disparar el clic y capturar la respuesta HTTP 200 de la base de datos
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'),
      submitBtn.click(),
    ]);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.token).toBeTruthy();
    expect(body.email).toBe(USERS.buyer.email);
    expect(body.role).toBe('Buyer');
    expect(body.userId).toBeTruthy();

    // 3. Validar que la navegación ocurrió exitosamente hacia la consola de comprador
    await page.waitForURL(/\/buyer/);
    expect(page.url()).toContain('/buyer');

    // 4. Validar que la sesión está persistida con el token legítimo emitido por .NET
    const storedToken = await page.evaluate((key) => window.localStorage.getItem(key), SESSION_TOKEN_KEY);
    expect(storedToken).toBe(body.token);
  });

  test('Flujo 4: Cero 404 — Clic en "¿Olvidaste tu contraseña?" navega limpiamente a /recuperar-contrasena', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Ubicamos el enlace / botón "¿Olvidaste tu contraseña?" en LoginPage
    const forgotBtn = page.getByRole('button', { name: /¿Olvidaste tu contraseña\?/i });
    await expect(forgotBtn).toBeVisible();
    await forgotBtn.click();

    // Validamos que la URL cambió a /recuperar-contrasena sin 404
    await page.waitForURL(/\/recuperar-contrasena/);
    expect(page.url()).toContain('/recuperar-contrasena');

    // Verificamos los átomos visuales Polaris de ForgotPasswordPage
    await expect(page.getByRole('heading', { name: /Recuperar contraseña/i, level: 1 })).toBeVisible();
    await expect(page.getByLabel(/Correo electrónico/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Enviar instrucciones/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Inicia sesión aquí/i })).toBeVisible();

    // Verificamos que no existe ningún rastro de pantalla 404
    await expect(page.getByText(/404/i)).not.toBeVisible();
    await expect(page.getByText(/Página no encontrada/i)).not.toBeVisible();
  });

  test('Flujo 5: Cero 404 — Ruta /restablecer-contrasena renderiza la tarjeta Polaris y campos seguros', async ({ page }) => {
    await page.goto('/restablecer-contrasena', { waitUntil: 'domcontentloaded' });

    expect(page.url()).toContain('/restablecer-contrasena');

    // Verificamos los átomos visuales Polaris de ResetPasswordPage
    await expect(page.getByRole('heading', { name: /Nueva contraseña/i, level: 1 })).toBeVisible();
    await expect(page.getByLabel(/^Nueva contraseña$/i)).toBeVisible();
    await expect(page.getByLabel(/Confirmar nueva contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Guardar nueva contraseña/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Inicia sesión aquí/i })).toBeVisible();

    // Comprobamos que no hay 404
    await expect(page.getByText(/404/i)).not.toBeVisible();
    await expect(page.getByText(/Página no encontrada/i)).not.toBeVisible();
  });

  test('Flujo 6: Recuperación de contraseña real (Formulario -> API .NET -> Resend/Mock -> Vista confirmación)', async ({ page }) => {
    await page.goto('/recuperar-contrasena', { waitUntil: 'domcontentloaded' });

    // 1. Ingresar correo de comprador existente
    const emailInput = page.getByLabel(/Correo electrónico/i);
    await expect(emailInput).toBeVisible();
    await emailInput.fill(USERS.buyer.email);

    const submitBtn = page.getByRole('button', { name: /Enviar instrucciones/i });
    await expect(submitBtn).toBeEnabled();

    // 2. Disparar envío y capturar respuesta HTTP 200 del backend .NET
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/forgot-password') && res.request().method() === 'POST'),
      submitBtn.click(),
    ]);
    expect(response.status()).toBe(200);

    // 3. Validar estado visual de confirmación en la UI
    await expect(page.getByRole('heading', { name: /Revisa tu bandeja de entrada/i })).toBeVisible();
    await expect(page.getByText(USERS.buyer.email)).toBeVisible();
    await expect(page.getByRole('button', { name: /Volver a iniciar sesión/i })).toBeVisible();
  });

  test('Flujo 7: Reintento de envío de correo — Permite resetear formulario y reintentar el envío sin recargar página', async ({ page }) => {
    await page.goto('/recuperar-contrasena', { waitUntil: 'domcontentloaded' });

    // Primer envío
    const emailInput = page.getByLabel(/Correo electrónico/i);
    await emailInput.fill(USERS.buyer.email);
    const submitBtn = page.getByRole('button', { name: /Enviar instrucciones/i });

    const [firstResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/forgot-password') && res.request().method() === 'POST'),
      submitBtn.click(),
    ]);
    expect(firstResponse.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /Revisa tu bandeja de entrada/i })).toBeVisible();

    // Clic en reintentar
    const retryBtn = page.getByRole('button', { name: /¿No recibiste el correo\? Intentar con otra dirección/i });
    await expect(retryBtn).toBeVisible();
    await retryBtn.click();

    // Validar retorno al formulario
    await expect(page.getByRole('heading', { name: /Recuperar contraseña/i, level: 1 })).toBeVisible();
    const emailInputRetry = page.getByLabel(/Correo electrónico/i);
    await expect(emailInputRetry).toHaveValue('');

    // Segundo envío (reintento)
    await emailInputRetry.fill(USERS.buyer.email);
    const [secondResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/forgot-password') && res.request().method() === 'POST'),
      page.getByRole('button', { name: /Enviar instrucciones/i }).click(),
    ]);
    expect(secondResponse.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /Revisa tu bandeja de entrada/i })).toBeVisible();
  });

  test('Flujo 8: Registro Completo de Comprador (/register), Persistencia Real en Base de Datos y Login Inmediato', async ({ page }) => {
    // 1. Navegar a /register
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Registro de Comprador/i })).toBeVisible();

    // 2. Generar datos únicos de prueba para evitar colisiones
    const suffix = Date.now().toString().slice(-6);
    const testDoc = `1035${suffix}`;
    const testName = 'Comprador Pruebas';
    const testEmail = `comprador-${suffix}@zentric.local`;
    const testPassword = 'Password123!';

    // 3. Completar el formulario con los campos requeridos
    await page.getByLabel(/Documento de Identidad/i).fill(testDoc);
    await page.getByLabel(/Nombre y Apellidos/i).fill(testName);
    await page.getByLabel(/Correo Electrónico/i).fill(testEmail);
    await page.getByLabel(/^Contraseña$/i).fill(testPassword);
    await page.getByLabel(/^Confirmar$/i).fill(testPassword);

    // 4. Enviar formulario y capturar la respuesta HTTP 200 real del backend (POST /api/Users)
    const [createResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/Users') && res.request().method() === 'POST'),
      page.getByRole('button', { name: /Crear Cuenta de Comprador/i }).click(),
    ]);

    expect(createResponse.status()).toBe(200);
    const createdUserId = await createResponse.json();
    expect(createdUserId).toMatch(/^[0-9a-f-]{36}$/i);

    // 5. Verificar redirección automática a /login con aviso de cuenta creada
    await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('aviso') === 'cuenta-creada');
    await expect(page.getByText(/Cuenta Creada Exitosamente/i)).toBeVisible();

    // 6. Realizar login con el usuario recién registrado
    await page.getByLabel(/Correo electrónico/i).fill(testEmail);
    await page.getByLabel(/^Contraseña$/i).fill(testPassword);

    const [loginResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'),
      page.getByRole('button', { name: /Continuar/i }).click(),
    ]);

    expect(loginResponse.status()).toBe(200);
    const loginData = await loginResponse.json();
    expect(loginData.token).toBeTruthy();
    expect(loginData.email).toBe(testEmail);
    expect(loginData.role).toBe('Buyer');
    expect(loginData.userId).toBe(createdUserId);

    // 7. Validar redirección al layout protegido de Comprador (/buyer)
    await page.waitForURL(/\/buyer/);
    expect(page.url()).toContain('/buyer');
    const token = await page.evaluate((key) => window.localStorage.getItem(key), SESSION_TOKEN_KEY);
    expect(token).toBeTruthy();
  });
});

