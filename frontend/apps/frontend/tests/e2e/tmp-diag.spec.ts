import { test } from '@playwright/test';
import { loginAsBuyer } from './support/auth';

test('diag', async ({ page }) => {
  const errs: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 200)));
  await loginAsBuyer(page);
  await page.goto('/buyer/catalog');
  await page.waitForTimeout(4000);
  console.log('URL:', page.url());
  console.log('H1:', await page.locator('h1').allInnerTexts().catch(() => []));
  console.log('BODY:', (await page.locator('body').innerText()).slice(0, 400));
  console.log('ERRS:', errs.slice(0, 5));
});
