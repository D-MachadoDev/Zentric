#!/usr/bin/env node
/**
 * Procesador de imagenes del brandkit de Zentric.
 * Genera variantes del isotipo por rol con transparencia, iconos en resoluciones
 * estandar (16x16 a 512x512) y assets de Open Graph.
 */

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const appRequire = createRequire(path.join(__dirname, '..', 'apps', 'frontend', 'package.json'));
const { chromium } = appRequire('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'apps', 'frontend', 'public', 'brandkit');
const FAVICON_DIR = path.join(OUT, 'favicon');
const LOGO_DIR = path.join(OUT, 'logo');
const OG_DIR = path.join(OUT, 'og');
const BOARDS_DIR = path.join(OUT, 'boards');

const FAVICON_SIZES = [16, 32, 48, 64, 96, 128, 180, 192, 512];

// Colores del "Sistema por Rol" (par [trazo principal, nodo/sombra])
const ROLE_TINTS = {
  buyer: { stroke: [45, 212, 191], node: [15, 118, 110] },       // Jade (#2DD4BF / #0F766E)
  seller: { stroke: [167, 139, 250], node: [109, 40, 217] },    // Violeta (#A78BFA / #6D28D9)
  admin: { stroke: [129, 140, 248], node: [67, 56, 202] },      // Índigo (#818CF8 / #4338CA)
  logistics: { stroke: [34, 211, 238], node: [14, 116, 144] },  // Cian (#22D3EE / #0E7490)
  supervisor: { stroke: [232, 121, 249], node: [162, 28, 175] }, // Magenta (#E879F9 / #A21CAF)
};

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function toDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function renderImageToPng(browser, srcPath, outPath, width, height) {
  const dataUrl = toDataUrl(srcPath);
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;padding:0;overflow:hidden;background:#0C0F16"><img src="${dataUrl}" style="width:100vw;height:100vh;object-fit:cover;display:block" /></body></html>`,
    { waitUntil: 'load' },
  );
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width, height } });
  await page.close();
}

/**
 * Extrae el isotipo Z de la imagen generada eliminando el fondo oscuro (#0C0F16)
 * y opcionalmente recolorea los píxeles del símbolo al color del rol preservando
 * todo el sombreado 3D y los nodos de la imagen original.
 */
async function extractTransparentLogoVariant(browser, srcPath, outPath, size, roleTint) {
  const dataUrl = toDataUrl(srcPath);
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });

  const tintJson = JSON.stringify(roleTint ?? null);

  await page.setContent(
    `<!doctype html>
<html>
<body style="margin:0;padding:0;background:transparent;overflow:hidden">
<canvas id="c" width="${size}" height="${size}" style="display:block"></canvas>
<script>
  window.__done = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d');
      // Recortamos el margen exterior (14% por lado) para que la Z ocupe bien el lienzo del icono
      const pad = Math.round(img.width * 0.14);
      const cropSize = img.width - pad * 2;
      ctx.drawImage(img, pad, pad, cropSize, cropSize, 0, 0, ${size}, ${size});

      const imgData = ctx.getImageData(0, 0, ${size}, ${size});
      const d = imgData.data;
      const tint = ${tintJson};

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        // En zentric-icon-dark.jpg el brillo ambiental de fondo tiene maxC <= 85,
        // mientras que los trazos 3D y los 4 nodos tienen maxC >= 130.
        const maxC = Math.max(r, g, b);
        if (maxC < 95) {
          d[i + 3] = 0;
          continue;
        }

        // Antialiasing limpio en el borde (95..135) sin halo de fondo
        const alpha = Math.min(1, Math.max(0, (maxC - 95) / 40));
        d[i + 3] = Math.round(alpha * 255);

        if (tint) {
          // Detectar si el píxel pertenece al nodo jade original (g > r + 25) o al trazo blanco/plata
          const isNode = (g - r) > 25;
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const boost = Math.min(1.18, Math.max(0.35, lum * 1.15));

          if (isNode) {
            // Nodos en el color brillante del rol
            d[i] = Math.min(255, Math.round(tint.stroke[0] * (0.75 + 0.35 * lum)));
            d[i + 1] = Math.min(255, Math.round(tint.stroke[1] * (0.75 + 0.35 * lum)));
            d[i + 2] = Math.min(255, Math.round(tint.stroke[2] * (0.75 + 0.35 * lum)));
          } else {
            // Brazos de la Z con sombreado dimensional entre node (sombra) y stroke (luz)
            const t = Math.min(1, Math.max(0, (lum - 0.25) / 0.7));
            d[i] = Math.min(255, Math.round((tint.node[0] * (1 - t) + tint.stroke[0] * t) * boost));
            d[i + 1] = Math.min(255, Math.round((tint.node[1] * (1 - t) + tint.stroke[1] * t) * boost));
            d[i + 2] = Math.min(255, Math.round((tint.node[2] * (1 - t) + tint.stroke[2] * t) * boost));
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve();
    };
    img.src = "${dataUrl}";
  });
</script>
</body>
</html>`,
    { waitUntil: 'load' },
  );

  await page.evaluate(() => window.__done);
  await page.screenshot({ path: outPath, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
}

async function main() {
  ensureDir(FAVICON_DIR);
  ensureDir(LOGO_DIR);
  ensureDir(OG_DIR);
  ensureDir(BOARDS_DIR);

  const iconDarkJpg = path.join(LOGO_DIR, 'zentric-icon-dark.jpg');
  const iconLightJpg = path.join(LOGO_DIR, 'zentric-icon.jpg');
  const coverDarkJpg = path.join(LOGO_DIR, 'zentric-cover-dark.jpg');

  if (!fs.existsSync(iconDarkJpg)) {
    console.error('ERROR: falta logo/zentric-icon-dark.jpg');
    process.exit(1);
  }

  console.log('🖼️  Procesando imágenes del brandkit y variantes por rol...\n');

  const browser = await chromium.launch();
  let made = 0;

  try {
    // Isotipo original con fondo transparente
    await extractTransparentLogoVariant(
      browser,
      iconDarkJpg,
      path.join(LOGO_DIR, 'zentric-icon-mark.png'),
      512,
      null,
    );
    console.log('  ✅ logo/zentric-icon-mark.png (transparente, original)');
    made++;

    // Variantes de color por rol con fondo transparente
    for (const [role, tint] of Object.entries(ROLE_TINTS)) {
      const outRole = path.join(LOGO_DIR, `zentric-icon-${role}.png`);
      await extractTransparentLogoVariant(browser, iconDarkJpg, outRole, 512, tint);
      console.log(`  ✅ logo/zentric-icon-${role}.png (transparente, color ${role})`);
      made++;
    }

    // Variantes de logotipo con fondo completo
    await renderImageToPng(browser, iconDarkJpg, path.join(LOGO_DIR, 'zentric-icon-dark.png'), 512, 512);
    console.log('  ✅ logo/zentric-icon-dark.png (512x512)');
    made++;

    if (fs.existsSync(iconLightJpg)) {
      await renderImageToPng(browser, iconLightJpg, path.join(LOGO_DIR, 'zentric-icon.png'), 512, 512);
      console.log('  ✅ logo/zentric-icon.png (512x512)');
      made++;
    }

    if (fs.existsSync(coverDarkJpg)) {
      await renderImageToPng(browser, coverDarkJpg, path.join(LOGO_DIR, 'zentric-cover-dark.png'), 1200, 675);
      console.log('  ✅ logo/zentric-cover-dark.png (1200x675)');
      made++;
    }

    // Generacion de favicons multi-resolucion
    for (const size of FAVICON_SIZES) {
      const out = path.join(FAVICON_DIR, `favicon-${size}x${size}.png`);
      await renderImageToPng(browser, iconDarkJpg, out, size, size);
      console.log(`  ✅ favicon/favicon-${size}x${size}.png`);
      made++;
    }

    await renderImageToPng(browser, iconDarkJpg, path.join(FAVICON_DIR, 'apple-touch-icon-180x180.png'), 180, 180);
    console.log('  ✅ favicon/apple-touch-icon-180x180.png');
    made++;

    // Generacion de imagen Open Graph
    if (fs.existsSync(coverDarkJpg)) {
      await renderImageToPng(browser, coverDarkJpg, path.join(OG_DIR, 'og-default.png'), 1200, 630);
      await renderImageToPng(browser, coverDarkJpg, path.join(OG_DIR, 'og-default-dark.png'), 1200, 630);
      console.log('  ✅ og/og-default.png & og/og-default-dark.png (1200x630)');
      made += 2;
    }
  } finally {
    await browser.close();
  }

  console.log(`\n  ${made} imágenes procesadas en ${OUT}`);
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
