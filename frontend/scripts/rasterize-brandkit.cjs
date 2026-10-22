#!/usr/bin/env node
/**
 * Brandkit Rasterizer - Zentric
 * ---------------------------------------------------------------------------
 * Convierte los SVG canonicos del brandkit en PNG usando Playwright (ya
 * instalado en el monorepo) y renderiza la imagen Open Graph 1200x630 desde
 * su template HTML.
 *
 * No depende de sharp ni de ImageMagick: el motor de Chromium que ya usa
 * Playwright para los E2E es el rasterizador.
 *
 * Ejecutar: node scripts/rasterize-brandkit.cjs
 */

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

// Playwright vive en apps/frontend/node_modules (pnpm strict). Se resuelve
// desde ahi para no depender de la raiz del monorepo.
const appRequire = createRequire(path.join(__dirname, '..', 'apps', 'frontend', 'package.json'));
const { chromium } = appRequire('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'apps', 'frontend', 'public', 'brandkit');
const FAVICON_DIR = path.join(OUT, 'favicon');
const LOGO_DIR = path.join(OUT, 'logo');
const OG_DIR = path.join(OUT, 'og');

const FAVICON_SIZES = [16, 32, 48, 64, 96, 128, 180, 192, 512];

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function renderSvgToPng(browser, svgPath, outPath, size) {
  const svg = fs.readFileSync(svgPath, 'utf-8');
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;padding:0;background:transparent">${svg
      .replace(/width="\d+"/, `width="${size}"`)
      .replace(/height="\d+"/, `height="${size}"`)}</body></html>`,
    { waitUntil: 'load' },
  );
  await page.screenshot({ path: outPath, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
}

async function renderHtmlToPng(browser, htmlPath, outPath, width, height) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width, height } });
  await page.close();
}

async function main() {
  if (!fs.existsSync(LOGO_DIR)) {
    console.error('ERROR: no existe el brandkit. Ejecuta antes: node scripts/generate-brandkit.cjs');
    process.exit(1);
  }

  ensureDir(FAVICON_DIR);
  ensureDir(OG_DIR);

  console.log('🖼️  Rasterizando brandkit con Playwright/Chromium...\n');

  const browser = await chromium.launch();
  let made = 0;

  try {
    // ── Favicons desde el icono canonico ──────────────────────────────────
    const iconSvg = path.join(LOGO_DIR, 'zentric-icon.svg');
    for (const size of FAVICON_SIZES) {
      const out = path.join(FAVICON_DIR, `favicon-${size}x${size}.png`);
      await renderSvgToPng(browser, iconSvg, out, size);
      console.log(`  ✅ favicon-${size}x${size}.png`);
      made++;
    }

    // ── Apple touch icon (fondo opaco, sin alfa) ───────────────────────────
    const appleSvg = fs.readFileSync(iconSvg, 'utf-8');
    const applePage = await browser.newPage({ viewport: { width: 180, height: 180 } });
    await applePage.setContent(
      `<!doctype html><html><body style="margin:0;background:#0C0F16">${appleSvg
        .replace(/width="\d+"/, 'width="180"')
        .replace(/height="\d+"/, 'height="180"')}</body></html>`,
    );
    await applePage.screenshot({ path: path.join(FAVICON_DIR, 'apple-touch-icon-180x180.png') });
    await applePage.close();
    console.log('  ✅ apple-touch-icon-180x180.png');
    made++;

    // ── Icono PWA 512 con fondo opaco ─────────────────────────────────────
    const pwaPage = await browser.newPage({ viewport: { width: 512, height: 512 } });
    await pwaPage.setContent(
      `<!doctype html><html><body style="margin:0;background:#0C0F16">${appleSvg
        .replace(/width="\d+"/, 'width="512"')
        .replace(/height="\d+"/, 'height="512"')}</body></html>`,
    );
    await pwaPage.screenshot({ path: path.join(FAVICON_DIR, 'favicon-512x512.png') });
    await pwaPage.close();
    console.log('  ✅ favicon-512x512.png (PWA, fondo opaco)');
    made++;

    // ── Open Graph 1200x630 ────────────────────────────────────────────────
    const ogTemplate = path.join(OG_DIR, 'template.html');
    if (fs.existsSync(ogTemplate)) {
      await renderHtmlToPng(browser, ogTemplate, path.join(OG_DIR, 'og-default.png'), 1200, 630);
      console.log('  ✅ og/og-default.png (1200x630)');
      made++;

      // Variante oscura
      const ogHtml = fs.readFileSync(ogTemplate, 'utf-8');
      const darkOg = ogHtml
        .replace(/#F5F6F8/g, '#0C0F16')
        .replace(/#0E1420/g, '#EDF1F7')
        .replace(/#454F63/g, '#98A2B8')
        .replace(/#E1E5EB/g, '#252D40')
        .replace(/#FFFFFF/g, '#131824')
        .replace(/#0F766E/g, '#2DD4BF');
      const darkPage = await browser.newPage({ viewport: { width: 1200, height: 630 } });
      await darkPage.setContent(darkOg, { waitUntil: 'load' });
      await darkPage.screenshot({ path: path.join(OG_DIR, 'og-default-dark.png') });
      await darkPage.close();
      console.log('  ✅ og/og-default-dark.png (1200x630)');
      made++;
    }
  } finally {
    await browser.close();
  }

  console.log(`\n  ${made} assets rasterizados en ${FAVICON_DIR}`);
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
