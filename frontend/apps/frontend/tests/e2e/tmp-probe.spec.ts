import { test, expect } from '@playwright/test';
import { loginAsBuyer } from './support/auth';

test('probe: la consola en 1440x900', async ({ page }) => {
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));

  await loginAsBuyer(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/buyer/catalog');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  console.log('URL:', page.url());
  console.log('errores:', JSON.stringify(errores, null, 2));
  console.log('body children:', await page.evaluate(() => document.body.children.length));
  console.log('main html len:', await page.evaluate(() => document.querySelector('main')?.innerHTML.length ?? -1));
  console.log('grid h3 count:', await page.evaluate(() => document.querySelectorAll('#product-grid h3').length));
  console.log('body text head:', await page.evaluate(() => document.body.innerText.slice(0, 200)));
});
