#!/usr/bin/env node
/**
 * Brandkit Generator - Zentric
 * Genera assets de marca: logo system, favicon set, og:image, social cards
 * Basado en doctrina visual: neutros tintados, Geist, acento #00D4AA
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const OUT_DIR = join(ROOT, 'apps', 'frontend', 'public', 'brandkit');
const ASSETS_DIR = join(ROOT, 'apps', 'frontend', 'src', 'assets', 'brand');

const COLORS = {
  // Neutros tintados (doctrina)
  bgPrimary: '#0B0F19',      // Carbón azulado profundo
  bgSurface: '#111827',      // Superficies/tarjetas
  bgElevated: '#161F30',     // Elevado/modal
  borderSubtle: '#1F293D',   // Bordes sutiles
  borderFocus: '#00D4AA',    // Focus ring
  
  // Texto
  textPrimary: '#F8FAFC',    // Blanco suave (no puro)
  textSecondary: '#94A3B8',  // Muted
  textMuted: '#64748B',      // Subtle
  
  // Acentos semánticos
  accentPrimary: '#00D4AA',  // Esmeralda/cian - Acción primaria
  accentWarning: '#FFB800',  // Ámbar - Advertencia
  accentDanger: '#EF4444',   // Rojo - Error/peligro
  accentInfo: '#3B82F6',     // Azul - Info
  
  // Semánticos extendidos
  success: '#00D4AA',
  warning: '#FFB800',
  error: '#EF4444',
  info: '#3B82F6',
};

const TYPOGRAPHY = {
  fontSans: '"Geist Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontMono: '"Geist Mono", "SF Mono", "Fira Code", monospace',
  weights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  sizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },
};

const SPACING = {
  base: '0.25rem', // 4px
  scale: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64],
};

const BORDER_RADIUS = {
  none: '0',
  sm: '0.25rem',    // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.5rem',     // 24px
  '2xl': '2rem',    // 32px
  full: '9999px',
};

const SHADOWS = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  '2xl': '0 50px 100px -20px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  focus: '0 0 0 3px rgb(0 212 170 / 0.4)',
};

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ============================================================================
// 1. Design Tokens JSON (para consumo en código)
// ============================================================================
function generateTokensJson() {
  const tokens = {
    colors: COLORS,
    typography: TYPOGRAPHY,
    spacing: SPACING,
    borderRadius: BORDER_RADIUS,
    shadows: SHADOWS,
    zIndex: {
      dropdown: 100,
      sticky: 200,
      modal: 300,
      popover: 400,
      tooltip: 500,
      toast: 600,
    },
    transitions: {
      fast: '150ms ease-out',
      normal: '200ms ease-out',
      slow: '300ms ease-out',
      spring: '400ms cubic-bezier(0.16, 1, 0.3, 1)',
    },
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  };
  
  ensureDir(OUT_DIR);
  writeFileSync(join(OUT_DIR, 'design-tokens.json'), JSON.stringify(tokens, null, 2));
  console.log('✅ design-tokens.json generado');
}

// ============================================================================
// 2. CSS Custom Properties (para uso directo en CSS)
// ============================================================================
function generateCssVariables() {
  let css = ':root {\n';
  
  // Colors
  for (const [key, value] of Object.entries(COLORS)) {
    css += `  --color-${kebabCase(key)}: ${value};\n`;
  }
  
  // Typography
  css += `  --font-sans: ${TYPOGRAPHY.fontSans};\n`;
  css += `  --font-mono: ${TYPOGRAPHY.fontMono};\n`;
  for (const [key, value] of Object.entries(TYPOGRAPHY.weights)) {
    css += `  --font-weight-${key}: ${value};\n`;
  }
  for (const [key, value] of Object.entries(TYPOGRAPHY.sizes)) {
    css += `  --text-${key}: ${value};\n`;
  }
  
  // Spacing
  for (const [key, value] of Object.entries(SPACING)) {
    if (key !== 'scale') {
      css += `  --space-${key}: ${value};\n`;
    }
  }
  
  // Border Radius
  for (const [key, value] of Object.entries(BORDER_RADIUS)) {
    css += `  --radius-${key}: ${value};\n`;
  }
  
  // Shadows
  for (const [key, value] of Object.entries(SHADOWS)) {
    css += `  --shadow-${key}: ${value};\n`;
  }
  
  // Transitions
  for (const [key, value] of Object.entries({ fast: '150ms ease-out', normal: '200ms ease-out', slow: '300ms ease-out' })) {
    css += `  --transition-${key}: ${value};\n`;
  }
  
  css += '}\n\n';
  
  // Dark mode (default)
  css += '@media (prefers-color-scheme: dark) {\n';
  css += '  :root {\n';
  css += `    --bg-primary: ${COLORS.bgPrimary};\n`;
  css += `    --bg-surface: ${COLORS.bgSurface};\n`;
  css += `    --bg-elevated: ${COLORS.bgElevated};\n`;
  css += `    --text-primary: ${COLORS.textPrimary};\n`;
  css += `    --text-secondary: ${COLORS.textSecondary};\n`;
  css += `    --border-subtle: ${COLORS.borderSubtle};\n`;
  css += '  }\n';
  css += '}\n\n';
  
  // Light mode
  css += '@media (prefers-color-scheme: light) {\n';
  css += '  :root {\n';
  css += '    --bg-primary: #F8FAFC;\n';
  css += '    --bg-surface: #FFFFFF;\n';
  css += '    --bg-elevated: #F1F5F9;\n';
  css += '    --text-primary: #0F172A;\n';
  css += '    --text-secondary: #475569;\n';
  css += '    --border-subtle: #E2E8F0;\n';
  css += '  }\n';
  css += '}\n';
  
  writeFileSync(join(OUT_DIR, 'variables.css'), css);
  console.log('✅ variables.css generado');
}

// ============================================================================
// 3. Logo System SVG (Wordmark + Icon)
// ============================================================================
function generateLogoSvg() {
  // Logo principal: wordmark "ZENTRIC" con acento en la Z
  const logoMain = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80">
  <defs>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#00D4AA;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00F5C8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <text x="0" y="58" font-family="Geist Sans, sans-serif" font-weight="700" font-size="56" fill="${COLORS.textPrimary}" letter-spacing="-0.02em">
    <tspan fill="url(#accentGradient)">Z</tspan>ENTRIC
  </text>
</svg>`;

  // Logo icono: Z estilizada con acento
  const logoIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00D4AA" />
      <stop offset="100%" style="stop-color:#00F5C8" />
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="56" height="56" rx="12" fill="${COLORS.bgSurface}" stroke="${COLORS.borderSubtle}" stroke-width="1"/>
  <path d="M16 16 L48 16 M48 16 L16 48 M16 48 L48 48" stroke="url(#iconGradient)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

  // Logo horizontal con tagline
  const logoHorizontal = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80" width="400" height="80">
  <defs>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#00D4AA;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00F5C8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <text x="0" y="58" font-family="Geist Sans, sans-serif" font-weight="700" font-size="56" fill="${COLORS.textPrimary}" letter-spacing="-0.02em">
    <tspan fill="url(#accentGradient)">Z</tspan>ENTRIC
  </text>
  <text x="0" y="72" font-family="Geist Mono, monospace" font-weight="500" font-size="11" fill="${COLORS.textSecondary}" letter-spacing="0.1em" text-transform="uppercase">
    Marketplace Multi-Vendedor
  </text>
</svg>`;

  ensureDir(join(OUT_DIR, 'logo'));
  writeFileSync(join(OUT_DIR, 'logo', 'zentric-wordmark.svg'), logoMain);
  writeFileSync(join(OUT_DIR, 'logo', 'zentric-icon.svg'), logoIcon);
  writeFileSync(join(OUT_DIR, 'logo', 'zentric-horizontal.svg'), logoHorizontal);
  console.log('✅ Logo SVGs generados (wordmark, icon, horizontal)');
}

// ============================================================================
// 4. Favicon Set (multiple sizes)
// ============================================================================
function generateFaviconHtml() {
  const faviconSizes = [16, 32, 48, 64, 96, 128, 180, 192, 512];
  
  let html = '<!-- Favicon Set - Zentric -->\n';
  html += '<link rel="icon" type="image/svg+xml" href="/brandkit/logo/zentric-icon.svg" />\n';
  
  for (const size of faviconSizes) {
    html += `<link rel="icon" type="image/png" sizes="${size}x${size}" href="/brandkit/favicon/favicon-${size}x${size}.png" />\n`;
  }
  
  html += '<link rel="apple-touch-icon" sizes="180x180" href="/brandkit/favicon/apple-touch-icon-180x180.png" />\n';
  html += '<link rel="manifest" href="/brandkit/manifest.json" />\n';
  html += '<meta name="theme-color" content="#0B0F19" />\n';
  html += '<meta name="msapplication-TileColor" content="#0B0F19" />\n';
  
  writeFileSync(join(OUT_DIR, 'favicon.html'), html);
  console.log('✅ favicon.html generado (referencia - generar PNGs con sharp/imagemagick)');
}

// ============================================================================
// 5. Web App Manifest
// ============================================================================
function generateManifest() {
  const manifest = {
    name: 'Zentric - Marketplace Multi-Vendedor',
    short_name: 'Zentric',
    description: 'Compra y vende con reserva de stock de 15 min, despacho rastreable y devolución segura',
    start_url: '/buyer/catalog',
    display: 'standalone',
    background_color: COLORS.bgPrimary,
    theme_color: COLORS.accentPrimary,
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'es-CO',
    dir: 'ltr',
    icons: [
      { src: '/brandkit/favicon/favicon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/brandkit/favicon/favicon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    categories: ['shopping', 'business', 'finance'],
    screenshots: [],
    shortcuts: [
      { name: 'Catálogo', short_name: 'Catálogo', url: '/buyer/catalog', icons: [{ src: '/brandkit/logo/zentric-icon.svg', sizes: '64x64' }] },
      { name: 'Carrito', short_name: 'Carrito', url: '/buyer/cart', icons: [{ src: '/brandkit/logo/zentric-icon.svg', sizes: '64x64' }] },
      { name: 'Mis Pedidos', short_name: 'Pedidos', url: '/buyer/orders', icons: [{ src: '/brandkit/logo/zentric-icon.svg', sizes: '64x64' }] },
    ],
  };
  
  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('✅ manifest.json generado');
}

// ============================================================================
// 6. Open Graph / Social Cards Templates
// ============================================================================
function generateOgTemplates() {
  const ogTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Zentric">
  <meta property="og:title" content="Zentric - Marketplace Multi-Vendedor">
  <meta property="og:description" content="Compra y vende con reserva de stock de 15 min, despacho rastreable y devolución segura">
  <meta property="og:image" content="https://zentric.me/brandkit/og/og-default.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Zentric - Tu marketplace de confianza">
  <meta property="og:url" content="https://zentric.me">
  <meta property="og:locale" content="es_CO">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@zentric_co">
  <meta name="twitter:creator" content="@zentric_co">
  <meta name="twitter:title" content="Zentric - Marketplace Multi-Vendedor">
  <meta name="twitter:description" content="Compra y vende con reserva de stock de 15 min, despacho rastreable y devolución segura">
  <meta name="twitter:image" content="https://zentric.me/brandkit/og/og-default.png">
  
  <meta name="theme-color" content="#0B0F19">
  <link rel="icon" type="image/svg+xml" href="/brandkit/logo/zentric-icon.svg">
</head>
<body>
  <script>window.location.href = "https://zentric.me";</script>
</body>
</html>`;

  ensureDir(join(OUT_DIR, 'og'));
  writeFileSync(join(OUT_DIR, 'og', 'template.html'), ogTemplate);
  console.log('✅ OG template generado (generar PNGs con Playwright/puppeteer)');
}

// ============================================================================
// 7. Tailwind Config Extension (para integrar tokens)
// ============================================================================
function generateTailwindExtension() {
  const config = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    '../../apps/frontend/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Neutros tintados (doctrina anti-IA)
        zentric: {
          bg: {
            primary: '#0B0F19',
            surface: '#111827',
            elevated: '#161F30',
          },
          border: {
            subtle: '#1F293D',
            focus: '#00D4AA',
          },
          text: {
            primary: '#F8FAFC',
            secondary: '#94A3B8',
            muted: '#64748B',
          },
        },
        // Acentos semánticos
        accent: {
          primary: '#00D4AA',
          warning: '#FFB800',
          danger: '#EF4444',
          info: '#3B82F6',
        },
        // Semánticos estándar
        success: '#00D4AA',
        warning: '#FFB800',
        danger: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['Geist Sans', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      borderRadius: {
        none: '0',
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        '2xl': '2rem',
        full: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '2xl': '0 50px 100px -20px rgb(0 0 0 / 0.25)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        focus: '0 0 0 3px rgb(0 212 170 / 0.4)',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-out': { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        'slide-up': { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'slide-down': { '0%': { transform: 'translateY(-10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'scale-in': { '0%': { transform: 'scale(0.95)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        'spin': { 'to': { transform: 'rotate(360deg)' } },
        'pulse-soft': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        'shimmer': { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'fade-out': 'fade-out 150ms ease-in',
        'slide-up': 'slide-up 200ms ease-out',
        'slide-down': 'slide-down 200ms ease-out',
        'scale-in': 'scale-in 150ms ease-out',
        'spin': 'spin 1s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};`;

  writeFileSync(join(OUT_DIR, 'tailwind.zentric.ts'), config);
  console.log('✅ tailwind.zentric.ts generado (extender en tailwind.config.ts)');
}

// ============================================================================
// 8. README del Brandkit
// ============================================================================
function generateReadme() {
  const readme = `# Zentric Brandkit

Assets de marca generados automáticamente siguiendo la **doctrina visual anti-IA genérica**.

## 🎨 Paleta de Colores

### Neutros Tintados (Obligatorios)
| Token | Hex | Uso |
|-------|-----|-----|
| \`--color-bg-primary\` | \`#0B0F19\` | Background principal |
| \`--color-bg-surface\` | \`#111827\` | Superficies/tarjetas |
| \`--color-bg-elevated\` | \`#161F30\` | Modales/elevados |
| \`--color-border-subtle\` | \`#1F293D\` | Bordes |
| \`--color-border-focus\` | \`#00D4AA\` | Focus rings |

### Acentos Semánticos (Únicos)
| Token | Hex | Uso |
|-------|-----|-----|
| \`--color-accent-primary\` | \`#00D4AA\` | **Acción primaria** (botones, links, focus) |
| \`--color-accent-warning\` | \`#FFB800\` | Advertencia/atención |
| \`--color-accent-danger\` | \`#EF4444\` | Error/peligro |
| \`--color-accent-info\` | \`#3B82F6\` | Información |

### ❌ Patrones Prohibidos
- Texto con degradados multicolores ("AI gradient text")
- Bordes izquierdos con barras de acento chillones
- Efectos cian-neón o púrpura-neón sobre negro absoluto
- Tarjetas clonadas idénticas sin jerarquía

## 📝 Tipografía

| Familia | Uso |
|---------|-----|
| **Geist Sans** | UI general, headings, body |
| **Geist Mono** | Datos tabulares, SKUs, monedas, código |

Pesos: Light(300) → Normal(400) → Medium(500) → Semibold(600) → Bold(700)

## 📦 Estructura del Brandkit

\`\`\`
brandkit/
├── design-tokens.json      # Tokens consumibles (Style Dictionary, Figma Tokens, etc.)
├── variables.css           # CSS Custom Properties
├── tailwind.zentric.ts     # Extensión Tailwind
├── logo/
│   ├── zentric-wordmark.svg
│   ├── zentric-icon.svg
│   └── zentric-horizontal.svg
├── favicon/
│   ├── favicon-16x16.png ... favicon-512x512.png
│   ├── apple-touch-icon-180x180.png
│   └── favicon.html        # Snippet HTML para <head>
├── manifest.json           # PWA Manifest
├── og/
│   └── template.html       # Template OG/Twitter cards
└── README.md               # Este archivo
\`\`\`

## 🚀 Uso

### En Tailwind (apps/frontend/tailwind.config.ts)
\`\`\`ts
import zentric from './brandkit/tailwind.zentric.ts';

export default {
  ...zentric,
  // tu config existente
}
\`\`\`

### En CSS Global
\`\`\`css
@import '/brandkit/variables.css';
\`\`\`

### En Componentes (via design-tokens.json)
\`\`\`ts
import tokens from '/brandkit/design-tokens.json';
const primaryColor = tokens.colors.accentPrimary; // '#00D4AA'
\`\`\`

### Favicon en index.html
\`\`\`html
<!-- Copiar contenido de favicon.html -->
<link rel="icon" type="image/svg+xml" href="/brandkit/logo/zentric-icon.svg" />
<link rel="manifest" href="/brandkit/manifest.json" />
<meta name="theme-color" content="#0B0F19" />
\`\`\`

## 🎯 Generación de Assets Rasterizados

Para PNGs (favicons, OG images, social cards):

\`\`\`bash
# Instalar sharp
pnpm add -D sharp

# Generar favicons desde SVG
node scripts/rasterize-favicons.mjs

# Generar OG images desde template HTML
node scripts/rasterize-og.mjs
\`\`\`

## ✅ Checklist de Cumplimiento

- [ ] Neutros tintados (no grises muertos, no #000000)
- [ ] Un solo acento primario (#00D4AA)
- [ ] Tipografía Geist Sans + Geist Mono
- [ ] Contraste WCAG 2.2 AA en todos los pares
- [ ] Focus visible en todos los interactivos
- [ ] Sin patrones prohibidos (AI gradient text, neon, bordes chillones)

---

*Generado automáticamente - No editar manualmente. Ejecutar \`pnpm brandkit:generate\` para regenerar.*
`;

  writeFileSync(join(OUT_DIR, 'README.md'), readme);
  console.log('✅ README.md generado');
}

// ============================================================================
// Helpers
// ============================================================================
function kebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// ============================================================================
// Main
// ============================================================================
console.log('🎨 Generando Zentric Brandkit...\n');

ensureDir(OUT_DIR);
ensureDir(join(OUT_DIR, 'logo'));
ensureDir(join(OUT_DIR, 'favicon'));
ensureDir(join(OUT_DIR, 'og'));
ensureDir(ASSETS_DIR);

generateTokensJson();
generateCssVariables();
generateLogoSvg();
generateFaviconHtml();
generateManifest();
generateOgTemplates();
generateTailwindExtension();
generateReadme();

console.log('\n🎉 Brandkit completo generado en:', OUT_DIR);
console.log('\n📋 Próximos pasos:');
console.log('  1. Generar PNGs rasterizados: pnpm rasterize:favicons && pnpm rasterize:og');
console.log('  2. Integrar tailwind.zentric.ts en tailwind.config.ts');
console.log('  3. Importar variables.css en global CSS');
console.log('  4. Copiar favicon.html a index.html');