#!/usr/bin/env node
/**
 * Brandkit Token Generator - Zentric
 * ---------------------------------------------------------------------------
 * FUENTE UNICA DE VERDAD: la paleta se PARSEA de
 * `frontendSDD/Frontend-Design-System.md` §9.1 / §9.2 o de
 * `packages/ui/src/styles/theme.css`.
 *
 * Genera UNICAMENTE tokens y metadatos (`design-tokens.json`, `variables.css`,
 * `tailwind.zentric.ts`, `favicon.html`, `manifest.json`).
 * Las imagenes y logos NO se generan con codigo: provienen de las imagenes
 * de diseño en `public/logo/` y `public/brandkit/boards/` y se
 * procesan con `node scripts/rasterize-brandkit.cjs`.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');
const SPEC = path.join(REPO, 'frontendSDD', 'Frontend-Design-System.md');
const THEME_CSS = path.join(ROOT, 'packages', 'ui', 'src', 'styles', 'theme.css');
const OUT = path.join(ROOT, 'apps', 'frontend', 'public', 'brandkit');

function parseFromThemeCss() {
  const css = fs.readFileSync(THEME_CSS, 'utf-8');
  const rootBlock = css.split(':root {')[1]?.split('}')[0] ?? '';
  const darkBlock = css.split(/\.dark \{/)[1]?.split('}')[0] ?? '';

  const parseVars = (block) => {
    const map = {};
    for (const m of block.matchAll(/--([a-z-]+)\s*:\s*(#[0-9A-Fa-f]{6})/g)) {
      map[m[1]] = m[2].toUpperCase();
    }
    return map;
  };

  const lightVars = parseVars(rootBlock);
  const darkVars = parseVars(darkBlock);

  const tokenNames = [
    'background',
    'surface',
    'surface-muted',
    'border',
    'border-subtle',
    'foreground',
    'foreground-muted',
    'foreground-subtle',
    'success',
    'warning',
    'danger',
    'info',
    'primary-foreground',
  ];

  const palette = {};
  for (const name of tokenNames) {
    if (lightVars[name] && darkVars[name]) {
      palette[name] = { light: lightVars[name], dark: darkVars[name] };
    }
  }

  const roles = {
    buyer: {
      light: lightVars['brand'] ?? '#0F766E',
      lightHover: lightVars['brand-strong'] ?? '#0B5D56',
      dark: darkVars['brand'] ?? '#2DD4BF',
      darkHover: darkVars['brand-strong'] ?? '#5EEAD4',
    },
  };

  for (const role of ['seller', 'admin', 'logistics', 'supervisor']) {
    const lightScope = css.match(new RegExp(`\\[data-role=['"]${role}['"]\\]\\s*\\{([^}]*)\\}`, 'i'));
    const darkScope = css.match(new RegExp(`\\.dark\\s+\\[data-role=['"]${role}['"]\\]\\s*\\{([^}]*)\\}`, 'i'));
    const lv = parseVars(lightScope?.[1] ?? '');
    const dv = parseVars(darkScope?.[1] ?? '');
    if (lv['brand'] && dv['brand']) {
      roles[role] = {
        light: lv['brand'],
        lightHover: lv['brand-strong'] ?? lv['brand'],
        dark: dv['brand'],
        darkHover: dv['brand-strong'] ?? dv['brand'],
      };
    }
  }

  return { palette, roles };
}

function parseLaw() {
  if (!fs.existsSync(SPEC)) {
    return parseFromThemeCss();
  }
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
const brand = R.buyer ?? { light: '#0F766E', lightHover: '#0B5D56', dark: '#2DD4BF', darkHover: '#5EEAD4' };

if (Object.keys(P).length < 8) {
  console.error('ERROR: no se pudo parsear la paleta §9.1. Revisa theme.css o el spec.');
  process.exit(1);
}

const designTokens = {
  $meta: {
    source: 'packages/ui/src/styles/theme.css (§9.1 / §9.2)',
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

function kebab(s) {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function buildVariablesCss() {
  let css = `/* Brandkit Zentric - generado desde packages/ui/src/styles/theme.css (§9).
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

function buildTailwindConfig() {
  const roleColors = Object.entries(R)
    .map(([role, a]) => `        '${role}': { light: '${a.light}', lightHover: '${a.lightHover}', dark: '${a.dark}', darkHover: '${a.darkHover}' },`)
    .join('\n');

  return `/** Brandkit Zentric - generado desde packages/ui/src/styles/theme.css (§9).
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

function buildManifest() {
  return JSON.stringify(
    {
      name: 'Zentric - Marketplace Multi-Vendedor',
      short_name: 'Zentric',
      description:
        'Compra y vende con reserva de stock de 15 min, despacho rastreable y devolucion segura',
      start_url: '/buyer/catalog',
      display: 'standalone',
      background_color: P.background.dark,
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
  let html = '<!-- Brandkit Zentric -->\n';
  html += '<link rel="icon" type="image/png" href="/logo/zentric-icon-dark.png" />\n';
  for (const s of sizes) {
    html += `<link rel="icon" type="image/png" sizes="${s}x${s}" href="/brandkit/favicon/favicon-${s}x${s}.png" />\n`;
  }
  html += '<link rel="apple-touch-icon" sizes="180x180" href="/brandkit/favicon/apple-touch-icon-180x180.png" />\n';
  html += '<link rel="manifest" href="/brandkit/manifest.json" />\n';
  html += `<meta name="theme-color" content="${P.background.dark}" />\n`;
  html += `<meta name="msapplication-TileColor" content="${P.background.dark}" />\n`;
  return html;
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function main() {
  console.log('🎨 Generando tokens y manifiesto del Brandkit Zentric...\n');

  ensureDir(path.join(OUT, 'logo'));
  ensureDir(path.join(OUT, 'favicon'));
  ensureDir(path.join(OUT, 'og'));
  ensureDir(path.join(OUT, 'boards'));

  const files = {
    'design-tokens.json': JSON.stringify(designTokens, null, 2),
    'variables.css': buildVariablesCss(),
    'tailwind.zentric.ts': buildTailwindConfig(),
    'manifest.json': buildManifest(),
    'favicon.html': buildFaviconHtml(),
  };

  for (const [rel, content] of Object.entries(files)) {
    const dest = path.join(OUT, rel);
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, content);
    console.log(`  ✅ ${rel}`);
  }

  console.log(`\n  📂 ${OUT}`);
}

main();
