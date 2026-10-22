#!/usr/bin/env node
/**
 * Brandkit Generator - Zentric
 * ---------------------------------------------------------------------------
 * FUENTE UNICA DE VERDAD: la paleta se PARSEA de
 * `frontendSDD/Frontend-Design-System.md` §9.1 (paleta dual) y §9.2
 * (identidad por rol), igual que `audit-design-system.cjs`.
 * No hay ninguna lista de colores duplicada en este script: si el Owner
 * cambia §9, el brandkit lo sigue.
 *
 * Genera: design-tokens.json, variables.css, tailwind.zentric.ts, logos SVG,
 * favicon.html, manifest.json y template OG.
 * Rasteriza (con Playwright, ya instalado): favicons PNG, apple-touch-icon,
 * OG image 1200x630 e icono PWA 512.
 *
 * Ejecutar: node scripts/generate-brandkit.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');
const SPEC = path.join(REPO, 'frontendSDD', 'Frontend-Design-System.md');
const OUT = path.join(ROOT, 'apps', 'frontend', 'public', 'brandkit');

// ── Parseo de la Ley ────────────────────────────────────────────────────────
function parseLaw() {
  const text = fs.readFileSync(SPEC, 'utf-8');
  const section9 = text.split(/^## 9\./m)[1] ?? text;
  const s91 = section9.split(/^### 9\.2/m)[0] ?? section9;
  const s92 = section9.split(/^### 9\.2/m)[1]?.split(/^### 9\.3/m)[0] ?? '';

  const palette = {};
  for (const line of s91.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    const m = (cells[1] ?? '').match(/`--([a-z-]+)`/);
    if (!m) continue;
    const light = (cells[2] ?? '').match(/`?(#[0-9A-Fa-f]{6})`?/);
    const dark = (cells[3] ?? '').match(/`?(#[0-9A-Fa-f]{6})`?/);
    if (light && dark) palette[m[1]] = { light: light[1].toUpperCase(), dark: dark[1].toUpperCase() };
  }

  const roles = {};
  for (const line of s92.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    const m = (cells[1] ?? '').match(/\*\*(\w+)\*\*/);
    if (!m) continue;
    const hexes = cells.slice(2, 6).join(' ').match(/#[0-9A-Fa-f]{6}/g) ?? [];
    if (hexes.length < 4) continue;
    roles[m[1].toLowerCase()] = {
      light: hexes[0].toUpperCase(),
      lightHover: hexes[1].toUpperCase(),
      dark: hexes[2].toUpperCase(),
      darkHover: hexes[3].toUpperCase(),
    };
  }

  return { palette, roles };
}

const { palette: P, roles: R } = parseLaw();
const brand = R.buyer ?? { light: '#0F766E', dark: '#2DD4BF' };

if (Object.keys(P).length < 8) {
  console.error('ERROR: no se pudo parsear la paleta §9.1 del spec. Revisa el formato de la tabla.');
  process.exit(1);
}

// ── Tokens ──────────────────────────────────────────────────────────────────
const designTokens = {
  $meta: {
    source: 'frontendSDD/Frontend-Design-System.md §9.1 / §9.2',
    generated: new Date().toISOString().slice(0, 10),
    note: 'Paleta dual. El acento de marca es el jade Comprador; los demas roles re-mapean --brand via data-role.',
  },
  color: {
    light: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.light])),
    dark: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.dark])),
  },
  roleAccent: Object.fromEntries(
    Object.entries(R).map(([role, a]) => [
      role,
      { light: a.light, lightHover: a.lightHover, dark: a.dark, darkHover: a.darkHover },
    ]),
  ),
  radius: { sm: '6px', md: '8px', lg: '12px', xl: '16px', '2xl': '20px', '3xl': '24px', '4xl': '28px', full: '9999px' },
  font: {
    sans: "'Geist Variable', system-ui, sans-serif",
    mono: "'Geist Mono Variable', ui-monospace, monospace",
  },
  motion: {
    'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
    'ease-out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
};

// ── CSS variables ───────────────────────────────────────────────────────────
function kebab(s) {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function buildVariablesCss() {
  let css = `/* Brandkit Zentric - generado desde frontendSDD/Frontend-Design-System.md §9.
   No editar a mano: regenerar con \`pnpm brandkit:generate\`. */

:root {
  /* Modo claro "Estudio Porcelana" (§9.1) */
`;
  for (const [k, v] of Object.entries(P)) css += `  --color-${kebab(k)}: ${v.light};\n`;
  css += `  --color-brand: ${brand.light};\n`;
  css += `  --color-brand-strong: ${brand.lightHover};\n`;

  css += `}

.dark {
  /* Modo oscuro "Boveda Grafito" (§9.1) */
`;
  for (const [k, v] of Object.entries(P)) css += `  --color-${kebab(k)}: ${v.dark};\n`;
  css += `  --color-brand: ${brand.dark};\n`;
  css += `  --color-brand-strong: ${brand.darkHover};\n`;

  css += `}

/* Identidad por rol (§9.2): el scope remapea SOLO el eje de acento. */
`;
  for (const [role, a] of Object.entries(R)) {
    if (role === 'buyer') continue;
    css += `[data-role='${role}'] {\n  --color-brand: ${a.light};\n  --color-brand-strong: ${a.lightHover};\n}\n`;
    css += `.dark [data-role='${role}'] {\n  --color-brand: ${a.dark};\n  --color-brand-strong: ${a.darkHover};\n}\n`;
  }
  return css;
}

// ── Logos ───────────────────────────────────────────────────────────────────
function logoIconSvg({ bg, border, accent, fg }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="${bg}"/>
  <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="13.25" fill="none" stroke="${border}" stroke-width="1.5"/>
  <path d="M17 17 L47 17" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
  <path d="M47 17 L17 47" stroke="${fg}" stroke-width="4" stroke-linecap="round"/>
  <path d="M17 47 L47 47" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
</svg>`;
}

function logoWordmarkSvg({ bg, fg, accent }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80">
  <rect width="320" height="80" fill="${bg}"/>
  <text x="12" y="57" font-family="Geist Variable, system-ui, sans-serif" font-weight="700" font-size="54" fill="${fg}" letter-spacing="-0.025em"><tspan fill="${accent}">Z</tspan>ENTRIC</text>
</svg>`;
}

function logoHorizontalSvg({ bg, fg, accent, muted }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 84" width="420" height="84">
  <rect width="420" height="84" fill="${bg}"/>
  <text x="12" y="52" font-family="Geist Variable, system-ui, sans-serif" font-weight="700" font-size="46" fill="${fg}" letter-spacing="-0.025em"><tspan fill="${accent}">Z</tspan>ENTRIC</text>
  <text x="14" y="72" font-family="Geist Mono Variable, ui-monospace, monospace" font-weight="500" font-size="10.5" fill="${muted}" letter-spacing="0.14em">MARKETPLACE MULTI-VENDEDOR</text>
</svg>`;
}

// ── Tailwind extension ──────────────────────────────────────────────────────
function buildTailwindConfig() {
  const roleColors = Object.entries(R)
    .map(([role, a]) => `        '${role}': { light: '${a.light}', lightHover: '${a.lightHover}', dark: '${a.dark}', darkHover: '${a.darkHover}' },`)
    .join('\n');

  return `/** Brandkit Zentric - generado desde frontendSDD/Frontend-Design-System.md §9.
 *  No editar a mano: regenerar con \`pnpm brandkit:generate\`.
 *  La app ya define su propia paleta en packages/ui/src/styles/theme.css (fuente
 *  unica real); este archivo es un espejo para consumidores externos. */

export const roleAccent = {
${roleColors}
};

export const palette = {
  light: ${JSON.stringify(Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.light])), null, 2).replace(/\n/g, '\n  ')},
  dark: ${JSON.stringify(Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.dark])), null, 2).replace(/\n/g, '\n  ')},
};

export const brandkitTailwind = {
  theme: {
    extend: {
      colors: {
        brand: 'var(--brand)',
        'brand-strong': 'var(--brand-strong)',
        background: 'var(--background)',
        surface: 'var(--surface)',
        'surface-muted': 'var(--surface-muted)',
        border: 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        foreground: 'var(--foreground)',
        'foreground-muted': 'var(--foreground-muted)',
        'foreground-subtle': 'var(--foreground-subtle)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
      },
      fontFamily: {
        sans: ["'Geist Variable'", 'system-ui', 'sans-serif'],
        mono: ["'Geist Mono Variable'", 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '6px', md: '8px', lg: '12px', xl: '16px', '2xl': '20px', '3xl': '24px', '4xl': '28px', full: '9999px',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
};

export default brandkitTailwind;
`;
}

// ── Manifest + favicon snippet + OG template ────────────────────────────────
function buildManifest() {
  return JSON.stringify(
    {
      name: 'Zentric - Marketplace Multi-Vendedor',
      short_name: 'Zentric',
      description:
        'Compra y vende con reserva de stock de 15 min, despacho rastreable y devolucion segura',
      start_url: '/buyer/catalog',
      display: 'standalone',
      background_color: P.background.light,
      theme_color: brand.light,
      orientation: 'portrait-primary',
      scope: '/',
      lang: 'es-CO',
      dir: 'ltr',
      icons: [
        { src: '/brandkit/favicon/favicon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/brandkit/favicon/favicon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
      categories: ['shopping', 'business', 'finance'],
      shortcuts: [
        { name: 'Catalogo', short_name: 'Catalogo', url: '/buyer/catalog' },
        { name: 'Carrito', short_name: 'Carrito', url: '/buyer/cart' },
        { name: 'Mis Pedidos', short_name: 'Pedidos', url: '/buyer/orders' },
      ],
    },
    null,
    2,
  );
}

function buildFaviconHtml() {
  const sizes = [16, 32, 48, 64, 96, 128, 180, 192, 512];
  let html = '<!-- Brandkit Zentric - generados por pnpm brandkit:generate -->\n';
  html += '<link rel="icon" type="image/svg+xml" href="/brandkit/logo/zentric-icon.svg" />\n';
  for (const s of sizes) {
    html += `<link rel="icon" type="image/png" sizes="${s}x${s}" href="/brandkit/favicon/favicon-${s}x${s}.png" />\n`;
  }
  html += '<link rel="apple-touch-icon" sizes="180x180" href="/brandkit/favicon/apple-touch-icon-180x180.png" />\n';
  html += '<link rel="manifest" href="/brandkit/manifest.json" />\n';
  html += `<meta name="theme-color" content="${P.background.light}" />\n`;
  html += `<meta name="msapplication-TileColor" content="${P.background.light}" />\n`;
  return html;
}

function buildOgHtml() {
  const title = 'Zentric';
  const tagline = 'Marketplace multi-vendedor';
  const bullets = ['Reserva atomica de 15 minutos', 'Despacho rastreable', 'Devolucion segura'];
  const bg = P.background.light;
  const fg = P.foreground.light;
  const muted = P['foreground-muted'].light;
  const accent = brand.light;
  const surface = P.surface.light;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Zentric" />
<meta property="og:title" content="Zentric - ${tagline}" />
<meta property="og:description" content="Compra y vende con reserva de stock de 15 minutos, despacho rastreable y devolucion segura." />
<meta property="og:image" content="https://zentric.me/brandkit/og/og-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Zentric - ${tagline}" />
<meta name="twitter:description" content="Reserva atomica de 15 minutos, despacho rastreable y devolucion segura." />
<meta name="twitter:image" content="https://zentric.me/brandkit/og/og-default.png" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: ${bg}; color: ${fg};
         font-family: 'Geist Variable', system-ui, sans-serif; display: flex; }
  .wrap { padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; width: 100%; }
  .mark { display: flex; align-items: center; gap: 18px; }
  .glyph { width: 64px; height: 64px; }
  h1 { font-size: 84px; font-weight: 700; letter-spacing: -0.03em; line-height: 1; }
  h1 span { color: ${accent}; }
  .tag { font-family: 'Geist Mono Variable', ui-monospace, monospace; font-size: 18px;
         letter-spacing: 0.18em; text-transform: uppercase; color: ${muted}; margin-top: 20px; }
  ul { list-style: none; display: flex; gap: 16px; flex-wrap: wrap; }
  li { background: ${surface}; border: 1px solid ${P.border.light}; color: ${fg};
       padding: 14px 22px; border-radius: 9999px; font-size: 19px; font-weight: 500; }
  li b { color: ${accent}; font-weight: 700; }
  .foot { display: flex; justify-content: space-between; align-items: flex-end; }
  .foot small { font-family: 'Geist Mono Variable', ui-monospace, monospace; font-size: 16px; color: ${muted}; }
</style>
</head>
<body>
  <div class="wrap">
    <div>
      <div class="mark">
        <svg class="glyph" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${surface}"/><rect x="0.75" y="0.75" width="62.5" height="62.5" rx="13.25" fill="none" stroke="${P.border.light}" stroke-width="1.5"/><path d="M17 17 L47 17" stroke="${accent}" stroke-width="4" stroke-linecap="round"/><path d="M47 17 L17 47" stroke="${fg}" stroke-width="4" stroke-linecap="round"/><path d="M17 47 L47 47" stroke="${accent}" stroke-width="4" stroke-linecap="round"/></svg>
        <div>
          <h1><span>Z</span>ENTRIC</h1>
          <div class="tag">${tagline}</div>
        </div>
      </div>
    </div>
    <ul>${bullets.map((b) => `<li><b>&#9679;</b> ${b}</li>`).join('\n      ')}</ul>
    <div class="foot">
      <small>zentric.me</small>
      <small>Reserva de stock 15 min &middot; Split de facturacion &middot; Inspeccion tecnica</small>
    </div>
  </div>
</body>
</html>`;
}

// ── Escritura ───────────────────────────────────────────────────────────────
function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function main() {
  console.log('🎨 Generando Zentric Brandkit (paleta parseada de §9 del spec)...\n');

  ensureDir(path.join(OUT, 'logo'));
  ensureDir(path.join(OUT, 'favicon'));
  ensureDir(path.join(OUT, 'og'));

  const light = {
    bg: P.background.light,
    fg: P.foreground.light,
    muted: P['foreground-muted'].light,
    border: P.border.light,
    surface: P.surface.light,
    accent: brand.light,
  };
  const dark = {
    bg: P.background.dark,
    fg: P.foreground.dark,
    muted: P['foreground-muted'].dark,
    border: P.border.dark,
    surface: P.surface.dark,
    accent: brand.dark,
  };

  const files = {
    'design-tokens.json': JSON.stringify(designTokens, null, 2),
    'variables.css': buildVariablesCss(),
    'tailwind.zentric.ts': buildTailwindConfig(),
    'manifest.json': buildManifest(),
    'favicon.html': buildFaviconHtml(),
    'logo/zentric-icon.svg': logoIconSvg(light),
    'logo/zentric-icon-dark.svg': logoIconSvg(dark),
    'logo/zentric-wordmark.svg': logoWordmarkSvg(light),
    'logo/zentric-wordmark-dark.svg': logoWordmarkSvg(dark),
    'logo/zentric-horizontal.svg': logoHorizontalSvg(light),
    'logo/zentric-horizontal-dark.svg': logoHorizontalSvg(dark),
    'og/template.html': buildOgHtml(),
  };

  for (const [rel, content] of Object.entries(files)) {
    const dest = path.join(OUT, rel);
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, content);
    console.log(`  ✅ ${rel}`);
  }

  console.log('\n  Paleta usada (parseada del spec):');
  console.log(`     claro  background ${P.background.light}  surface ${P.surface.light}  brand ${brand.light}`);
  console.log(`     oscuro background ${P.background.dark}  surface ${P.surface.dark}  brand ${brand.dark}`);
  console.log(`     roles: ${Object.keys(R).join(', ')}`);
  console.log(`\n  📂 ${OUT}`);
  console.log('  ➡️  siguiente: node scripts/rasterize-brandkit.cjs');
}

main();
