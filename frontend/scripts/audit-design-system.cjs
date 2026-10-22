#!/usr/bin/env node
/**
 * Design System Audit - Zentric
 * ---------------------------------------------------------------------------
 * Valida el frontend contra la LEY (frontendSDD/Frontend-Design-System.md §9,
 * ADDENDUM dictado por el Owner) en lugar de contra supuestos hardcodeados.
 *
 * Diseño de la auditoria:
 *   1. PARSEA la paleta normativa §9.1 y la matriz de identidad §9.2 del
 *      propio spec Markdown (fuente de verdad).
 *   2. VERIFICA que theme.css las implementa exactamente.
 *   3. CALCULA el contraste WCAG 2.1 AA de los pares que el spec declara,
 *      en modo claro y oscuro, y compara contra los ratios afirmados.
 *   4. INVENTARIA el repo real (primitives/, components/ui/, composite/,
 *      tokens/, logo/, modules/**) sin inventar nombres de archivo.
 *
 * Ejecutar: node scripts/audit-design-system.cjs
 * Exit code 0 = sin fallos (puede haber avisos). 1 = hay fallos.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');
const SPEC = path.join(REPO, 'frontendSDD', 'Frontend-Design-System.md');
const UI_SRC = path.join(ROOT, 'packages', 'ui', 'src');
const APP_SRC = path.join(ROOT, 'apps', 'frontend', 'src');

const results = [];
let current = null;

function category(name) {
  current = { name, checks: [], pass: 0, fail: 0, warn: 0 };
  results.push(current);
}

function check(name, status, message, file) {
  current.checks.push({ name, status, message, file });
  if (status === 'pass') current.pass++;
  else if (status === 'fail') current.fail++;
  else current.warn++;
}

const pass = (n, m, f) => check(n, 'pass', m, f);
const fail = (n, m, f) => check(n, 'fail', m, f);
const warn = (n, m, f) => check(n, 'warn', m, f);

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function read(p) {
  return fs.readFileSync(p, 'utf-8');
}

function walk(dir, exts) {
  const out = [];
  if (!exists(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const entry of fs.readdirSync(d)) {
      const full = path.join(d, entry);
      let st;
      try {
        st = fs.statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist' && entry !== 'build') {
          stack.push(full);
        }
      } else if (!exts || exts.includes(path.extname(full))) {
        out.push(full);
      }
    }
  }
  return out;
}

/**
 * Busca por SUFIJO de nombre de archivo, no por extension.
 * `path.extname('primitives.test.tsx')` devuelve `.tsx`, no `.test.tsx`;
 * un filtro por extension no distinguiria un test de un modulo.
 */
function walkBySuffix(dir, suffixes) {
  return walk(dir, null).filter((f) => suffixes.some((s) => f.endsWith(s)));
}

const TEST_SUFFIXES = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'];
const STORY_SUFFIXES = ['.stories.tsx', '.stories.ts'];

// ─────────────────────────────────────────────────────────────────────────────
// WCAG 2.1 contrast
// ─────────────────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// ─────────────────────────────────────────────────────────────────────────────
// 0. Spec presente
// ─────────────────────────────────────────────────────────────────────────────
category('0. Ley: fuente de verdad disponible');

if (!exists(SPEC)) {
  fail('Frontend-Design-System.md existe', `FALTA: ${SPEC}`);
  report();
  process.exit(1);
}
pass('Frontend-Design-System.md existe', 'Ley del frontend localizada', SPEC);

const specText = read(SPEC);

// Extraer la paleta dual normativa de §9.1 (tabla Markdown con 3 columnas
// de token: runtime, claro, oscuro). Formato:
// | `--background` | `#F5F6F8` ... | `#0C0F16` ... | Lienzo base |
const section9 = specText.split(/^## 9\./m)[1] ?? specText;
const section91 = section9.split(/^### 9\.2/m)[0] ?? section9;
const section92 = section9.split(/^### 9\.2/m)[1]?.split(/^### 9\.3/m)[0] ?? '';

const PALETTE = {};
for (const line of section91.split(/\r?\n/)) {
  if (!line.trim().startsWith('|')) continue;
  const cells = line.split('|').map((c) => c.trim());
  // cells[0] vacio, [1] token, [2] claro, [3] oscuro, [4] rol
  const tokenCell = cells[1] ?? '';
  const tokenMatch = tokenCell.match(/`--([a-z-]+)`/);
  if (!tokenMatch) continue;
  const light = (cells[2] ?? '').match(/`?(#[0-9A-Fa-f]{6})`?/);
  const dark = (cells[3] ?? '').match(/`?(#[0-9A-Fa-f]{6})`?/);
  if (light && dark) {
    PALETTE[tokenMatch[1]] = { light: light[1].toUpperCase(), dark: dark[1].toUpperCase() };
  }
}

// Matriz de identidad por rol §9.2: | **Buyer** (jade de marca) | `#0F766E` | `#0B5D56` | `#2DD4BF` | `#5EEAD4` | 5.06:1 |
const ROLE_ACCENTS = {};
for (const line of section92.split(/\r?\n/)) {
  if (!line.trim().startsWith('|')) continue;
  const cells = line.split('|').map((c) => c.trim());
  const roleMatch = (cells[1] ?? '').match(/\*\*(\w+)\*\*/);
  if (!roleMatch) continue;
  const hexes = cells.slice(2, 6).join(' ').match(/#[0-9A-Fa-f]{6}/g) ?? [];
  if (hexes.length < 4) continue;
  ROLE_ACCENTS[roleMatch[1].toLowerCase()] = {
    light: hexes[0].toUpperCase(),
    lightHover: hexes[1].toUpperCase(),
    dark: hexes[2].toUpperCase(),
    darkHover: hexes[3].toUpperCase(),
  };
}

const paletteTokens = Object.keys(PALETTE);
if (paletteTokens.length >= 8) {
  pass(
    `Paleta dual §9.1 parseada (${paletteTokens.length} tokens)`,
    `Tokens: ${paletteTokens.join(', ')}`,
    SPEC,
  );
} else {
  fail(
    'Paleta dual §9.1 parseada',
    `Solo ${paletteTokens.length} tokens extraidos (se esperaban >= 8). El spec cambio de formato.`,
    SPEC,
  );
}

const roleNames = Object.keys(ROLE_ACCENTS);
if (roleNames.length === 5) {
  pass(`Matriz de rol §9.2 parseada (${roleNames.length} roles)`, `Roles: ${roleNames.join(', ')}`, SPEC);
} else {
  fail(
    'Matriz de rol §9.2 parseada',
    `Solo ${roleNames.length} roles extraidos (se esperaban 5: buyer, seller, admin, logistics, supervisor).`,
    SPEC,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. theme.css implementa la paleta §9.1
// ─────────────────────────────────────────────────────────────────────────────
category('1. theme.css implementa la paleta §9.1');

const THEME = path.join(UI_SRC, 'styles', 'theme.css');
let rootBlock = '';
let darkBlock = '';
let cssEffective = '';
if (!exists(THEME)) {
  fail('theme.css existe', `FALTA: ${THEME}`);
} else {
  pass('theme.css existe (fuente unica de verdad)', 'OK', THEME);
  const css = read(THEME);

  // Separar bloque :root (claro) y bloque .dark (oscuro).
  rootBlock = css.split(':root {')[1]?.split('}')[0] ?? '';
  darkBlock = css.split(/\.dark \{/)[1]?.split('}')[0] ?? '';

  for (const [token, { light, dark }] of Object.entries(PALETTE)) {
    const inLight = rootBlock.includes(light);
    const inDark = darkBlock.includes(dark);
    if (inLight && inDark) {
      pass(`${token} declara ${light} (claro) y ${dark} (oscuro)`, 'OK', THEME);
    } else {
      fail(
        `${token} declara ${light} (claro) y ${dark} (oscuro)`,
        `Claro=${inLight ? 'OK' : 'FALTA ' + light} | Oscuro=${inDark ? 'OK' : 'FALTA ' + dark}`,
        THEME,
      );
    }
  }

  // Prohibition §9.1: negro puro y grises desaturados prohibidos.
  const pureBlack = /#000000\b/.test(css);
  pureBlack
    ? fail('Sin negro puro #000000', 'DETECTADO #000000 en theme.css', THEME)
    : pass('Sin negro puro #000000', 'OK', THEME);

  // Grises desaturados: R=G=B en cualquier hex de 6 digitos.
  // §9.3 exime explicitamente el blanco #FFFFFF ("papel nitido, no un gris
  // desaturado"); el resto de neutros debe tener tinte frio (B > R).
  const desaturated = [...css.matchAll(/#([0-9a-f]{6})/gi)]
    .map((m) => m[1])
    .filter((h) => {
      if (h.toUpperCase() === 'FFFFFF') return false; // exencion §9.3
      const r = h.slice(0, 2).toLowerCase();
      const g = h.slice(2, 4).toLowerCase();
      const b = h.slice(4, 6).toLowerCase();
      return r === g && g === b;
    });
  desaturated.length === 0
    ? pass('Sin grises desaturados (R=G=B), excepcion §9.3 para #FFFFFF', 'OK', THEME)
    : fail('Sin grises desaturados (R=G=B), excepcion §9.3 para #FFFFFF', `Detectados: ${[...new Set(desaturated)].join(', ')}`, THEME);

  // El acento cian neon #00D4AA y el indigo electrico estan prohibidos (§9.1).
  // Se evalua SOLO el CSS efectivo: los comentarios que documentan el rechazo
  // de un color no cuentan como uso.
  cssEffective = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const banned = [
    { hex: '#00D4AA', why: 'cian neon (look v1 rechazado)' },
    { hex: '#4F46E5', why: 'indigo electrico (8-A1 rechazado)' },
    { hex: '#6366F1', why: 'indigo electrico (8-A1 rechazado)' },
  ];
  for (const { hex, why } of banned) {
    const found = cssEffective.toUpperCase().includes(hex.toUpperCase());
    found
      ? fail(`Prohibido ausente: ${hex}`, `DETECTADO ${hex} en CSS efectivo - ${why}`, THEME)
      : pass(`Prohibido ausente: ${hex}`, `OK - ${why}`, THEME);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. theme.css implementa la identidad por rol §9.2
// ─────────────────────────────────────────────────────────────────────────────
category('2. Identidad por rol §9.2 (data-role)');

if (exists(THEME)) {
  const css = read(THEME);
  for (const [role, accents] of Object.entries(ROLE_ACCENTS)) {
    // §9.2: el jade Comprador es la identidad por DEFECTO (rige sin scope en
    // paginas publicas), por lo que vive en :root y no en un [data-role].
    if (role === 'buyer') {
      const rootHas = rootBlock.includes(accents.light) && rootBlock.includes(accents.lightHover);
      const darkHas = darkBlock.includes(accents.dark) && darkBlock.includes(accents.darkHover);
      rootHas && darkHas
        ? pass(
            `Identidad por defecto Buyer (jade) declarada en :root/.dark - ${accents.light} / ${accents.dark}`,
            'OK',
            THEME,
          )
        : fail(
            `Identidad por defecto Buyer (jade) declarada en :root/.dark - ${accents.light} / ${accents.dark}`,
            `Claro=${rootHas ? 'OK' : 'FALTA'} | Oscuro=${darkHas ? 'OK' : 'FALTA'}`,
            THEME,
          );
      continue;
    }

    const scopeRe = new RegExp(`\\[data-role=['"]${role}['"]\\]\\s*\\{([^}]*)\\}`, 'i');
    const scope = css.match(scopeRe);
    if (!scope) {
      fail(`Scope [data-role='${role}'] existe`, `FALTA scope para el rol ${role}`, THEME);
      continue;
    }
    const block = scope[1];
    const darkScope = css.match(
      new RegExp(`\\.dark\\s+\\[data-role=['"]${role}['"]\\]\\s*\\{([^}]*)\\}`, 'i'),
    );
    const darkBlockRole = darkScope ? darkScope[1] : '';

    const lightOk = block.includes(accents.light) && block.includes(accents.lightHover);
    const darkOk = darkBlockRole.includes(accents.dark) && darkBlockRole.includes(accents.darkHover);

    if (lightOk && darkOk) {
      pass(
        `[data-role='${role}'] declara acento claro ${accents.light} y oscuro ${accents.dark}`,
        'OK',
        THEME,
      );
    } else {
      fail(
        `[data-role='${role}'] declara acento claro ${accents.light} y oscuro ${accents.dark}`,
        `Claro=${lightOk ? 'OK' : 'FALTA'} | Oscuro=${darkOk ? 'OK' : 'FALTA'}`,
        THEME,
      );
    }
  }

  // El acento debe derivar de --brand (no de un literal disperso).
  const bridgeOk = /--primary:\s*var\(--brand\)/.test(css) && /--ring:\s*var\(--brand\)/.test(css);
  bridgeOk
    ? pass('--primary y --ring derivan de --brand (identidad por rol sin tocar componentes)', 'OK', THEME)
    : fail(
        '--primary y --ring derivan de --brand (identidad por rol sin tocar componentes)',
        'Falta el puente var(--brand) en --primary o --ring',
        THEME,
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Contraste WCAG 2.1 AA calculado (§9.4)
// ─────────────────────────────────────────────────────────────────────────────
category('3. Contraste WCAG 2.1 AA (calculado, §9.4)');

if (paletteTokens.length >= 8) {
  // El spec §9.1 declara el ratio en la celda de la derecha, entre parentesis.
  const declaredRatios = {};
  for (const line of section91.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    const tokenMatch = (cells[1] ?? '').match(/`--([a-z-]+)`/);
    if (!tokenMatch) continue;
    const ratio = (cells[2] ?? '').match(/([\d.]+)\s*:\s*1/);
    if (ratio) declaredRatios[tokenMatch[1]] = parseFloat(ratio[1]);
  }

  const PAIRS = [
    { fg: 'foreground', bg: 'background', min: 4.5, label: 'texto primario / lienzo' },
    { fg: 'foreground-muted', bg: 'background', min: 4.5, label: 'texto secundario / lienzo' },
    { fg: 'foreground-subtle', bg: 'background', min: 4.5, label: 'metadatos / lienzo' },
    { fg: 'foreground', bg: 'surface', min: 4.5, label: 'texto primario / superficie' },
    { fg: 'success', bg: 'background', min: 4.5, label: 'success / lienzo' },
    { fg: 'warning', bg: 'background', min: 4.5, label: 'warning / lienzo' },
    { fg: 'danger', bg: 'background', min: 4.5, label: 'danger / lienzo' },
    { fg: 'info', bg: 'background', min: 4.5, label: 'info / lienzo' },
  ];

  for (const mode of ['light', 'dark']) {
    for (const p of PAIRS) {
      const fg = PALETTE[p.fg]?.[mode];
      const bg = PALETTE[p.bg]?.[mode];
      if (!fg || !bg) continue;
      const ratio = contrastRatio(fg, bg);
      if (ratio === null) {
        fail(`[${mode}] ${p.label} calculable`, 'Color no parseable', THEME);
        continue;
      }
      const ok = ratio >= p.min;
      const declared = declaredRatios[p.fg];
      const drift = declared && Math.abs(ratio - declared) > 0.15 ? ` (spec declara ${declared}:1)` : '';
      const status = ok ? 'pass' : 'fail';
      check(
        `[${mode}] ${p.label} >= ${p.min}:1`,
        status,
        `medido ${ratio.toFixed(2)}:1${drift}`,
        THEME,
      );
    }
  }

  // Texto sobre relleno de acento: primary-foreground sobre cada --brand de rol.
  const primaryFgLight = PALETTE['primary-foreground']?.light;
  const primaryFgDark = PALETTE['primary-foreground']?.dark;
  if (primaryFgLight && primaryFgDark) {
    for (const [role, accents] of Object.entries(ROLE_ACCENTS)) {
      const rl = contrastRatio(primaryFgLight, accents.light);
      const rd = contrastRatio(primaryFgDark, accents.dark);
      const okL = rl !== null && rl >= 4.5;
      const okD = rd !== null && rd >= 4.5;
      okL && okD
        ? pass(
            `Texto sobre acento de rol '${role}' >= 4.5:1 (claro ${rl.toFixed(2)}:1, oscuro ${rd.toFixed(2)}:1)`,
            'OK',
            THEME,
          )
        : fail(
            `Texto sobre acento de rol '${role}' >= 4.5:1`,
            `claro ${rl?.toFixed(2)}:1 | oscuro ${rd?.toFixed(2)}:1`,
            THEME,
          );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Inventario real del design system
// ─────────────────────────────────────────────────────────────────────────────
category('4. Inventario del design system (rutas reales)');

const LAYERS = [
  { dir: path.join(UI_SRC, 'tokens'), label: 'tokens' },
  { dir: path.join(UI_SRC, 'primitives'), label: 'primitives' },
  { dir: path.join(UI_SRC, 'components', 'ui'), label: 'components/ui' },
  { dir: path.join(UI_SRC, 'composite'), label: 'composite' },
  { dir: path.join(UI_SRC, 'logo'), label: 'logo' },
];

for (const layer of LAYERS) {
  if (!exists(layer.dir)) {
    fail(`Capa ${layer.label}/ existe`, `FALTA: ${layer.dir}`);
    continue;
  }
  const files = walk(layer.dir, ['.ts', '.tsx']).filter(
    (f) => !TEST_SUFFIXES.some((s) => f.endsWith(s)) && !STORY_SUFFIXES.some((s) => f.endsWith(s)),
  );
  const tests = walkBySuffix(layer.dir, TEST_SUFFIXES);
  const stories = walkBySuffix(layer.dir, STORY_SUFFIXES);

  files.length > 0
    ? pass(`Capa ${layer.label}/ tiene ${files.length} modulos`, 'OK', layer.dir)
    : fail(`Capa ${layer.label}/ tiene modulos`, 'Capa vacia', layer.dir);

  if (layer.label === 'tokens' || layer.label === 'logo') {
    tests.length > 0
      ? pass(`Capa ${layer.label}/ tiene suite de tests (${tests.length})`, 'OK', layer.dir)
      : warn(`Capa ${layer.label}/ sin suite de tests`, 'Sin cobertura de tests en esta capa', layer.dir);
  } else {
    tests.length > 0
      ? pass(`Capa ${layer.label}/ tiene suite de tests (${tests.length})`, 'OK', layer.dir)
      : fail(`Capa ${layer.label}/ sin suite de tests`, 'Capa sin cobertura', layer.dir);
  }

  if (stories.length > 0) {
    pass(`Capa ${layer.label}/ tiene stories (${stories.length})`, 'OK', layer.dir);
  } else {
    warn(`Capa ${layer.label}/ sin stories`, 'Sin catalogo Storybook para esta capa', layer.dir);
  }
}

// Cada componente exportado por una capa debe tener story o estar cubierto.
category('5. Cobertura Storybook por componente');
for (const layer of LAYERS) {
  if (!exists(layer.dir)) continue;
  const comps = walk(layer.dir, ['.tsx']).filter(
    (f) => !TEST_SUFFIXES.some((s) => f.endsWith(s)) && !STORY_SUFFIXES.some((s) => f.endsWith(s)) && !f.endsWith('index.tsx'),
  );
  for (const comp of comps) {
    const base = path.basename(comp, '.tsx');
    const hasStory = fs.existsSync(path.join(path.dirname(comp), `${base}.stories.tsx`));
    hasStory
      ? pass(`${layer.label}/${base} tiene story`, 'OK', comp)
      : warn(`${layer.label}/${base} sin story`, 'Componente sin catalogo Storybook', comp);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Modulos por rol (inventario real, sin inventar nombres)
// ─────────────────────────────────────────────────────────────────────────────
category('6. Modulos por rol (inventario real)');

const MODULES_DIR = path.join(APP_SRC, 'modules');
const ROLES = ['buyer', 'seller', 'admin', 'logistics', 'supervisor', 'auth'];

if (!exists(MODULES_DIR)) {
  fail('Directorio modules/ existe', `FALTA: ${MODULES_DIR}`);
} else {
  for (const role of ROLES) {
    const dir = path.join(MODULES_DIR, role);
    if (!exists(dir)) {
      fail(`Modulo ${role}/ existe`, 'FALTA modulo', dir);
      continue;
    }
    const pages = walk(dir, ['.tsx']).filter(
      (f) =>
        !TEST_SUFFIXES.some((s) => f.endsWith(s)) &&
        !STORY_SUFFIXES.some((s) => f.endsWith(s)) &&
        !f.includes(`${path.sep}components${path.sep}`),
    );
    const tests = walkBySuffix(dir, TEST_SUFFIXES);
    const stories = walkBySuffix(dir, STORY_SUFFIXES);

    pages.length > 0
      ? pass(`Modulo ${role}/ tiene ${pages.length} paginas`, 'OK', dir)
      : fail(`Modulo ${role}/ tiene paginas`, 'Modulo sin paginas', dir);

    tests.length > 0
      ? pass(`Modulo ${role}/ tiene suite de tests (${tests.length})`, 'OK', dir)
      : fail(`Modulo ${role}/ sin suite de tests`, 'Modulo sin cobertura', dir);

    stories.length > 0
      ? pass(`Modulo ${role}/ tiene stories (${stories.length})`, 'OK', dir)
      : warn(`Modulo ${role}/ sin stories`, 'Modulo sin catalogo Storybook', dir);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Reglas Anti-IA §2.2 / §9.3 (busqueda estatica en el codigo)
// ─────────────────────────────────────────────────────────────────────────────
category('7. Reglas Anti-IA generica (busqueda estatica)');

const APP_FILES = walk(APP_SRC, ['.tsx', '.ts', '.css']);
const ANTI_IA = [
  { re: /bg-clip-text/, label: 'Texto degradado multicolor (AI gradient text)', severity: 'fail' },
  { re: /text-transparent\s+bg-gradient-|bg-gradient-[^\s"']*[\s"']+text-transparent/, label: 'Degradado en texto', severity: 'fail' },
  { re: /border-l-4/, label: 'Barra lateral de acento chillon', severity: 'fail' },
  { re: /\bneon\b|drop-shadow-\[0_0_\d+px_#/, label: 'Resplandor neon', severity: 'fail' },
];

for (const rule of ANTI_IA) {
  const hits = [];
  for (const file of APP_FILES) {
    const content = read(file);
    if (rule.re.test(content)) hits.push(path.relative(REPO, file));
  }
  if (hits.length === 0) {
    pass(`Cero ocurrencias: ${rule.label}`, 'OK');
  } else {
    check(
      `Cero ocurrencias: ${rule.label}`,
      rule.severity,
      `Detectado en ${hits.length} archivo(s): ${hits.slice(0, 5).join(', ')}${hits.length > 5 ? ' ...' : ''}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Accesibilidad: patrones ARIA en el codigo de aplicacion
// ─────────────────────────────────────────────────────────────────────────────
category('8. Accesibilidad WCAG 2.2 (patrones en codigo)');

const A11Y = [
  { re: /aria-label|aria-labelledby|aria-describedby/, label: 'Etiquetas ARIA' },
  { re: /role="/, label: 'Roles ARIA explicitos' },
  { re: /aria-busy=/, label: 'aria-busy en mutaciones activas' },
  { re: /focus-visible|focus:outline/, label: 'Estilos de foco visible' },
  { re: /sr-only/, label: 'Contenido solo para lector de pantalla' },
  { re: /alt=/, label: 'Texto alternativo en imagenes' },
];

for (const rule of A11Y) {
  const count = APP_FILES.filter((f) => rule.re.test(read(f))).length;
  const pct = APP_FILES.length ? (count / APP_FILES.length) * 100 : 0;
  if (count === 0) {
    fail(`${rule.label} presente en el codigo`, '0 ocurrencias', APP_SRC);
  } else {
    pass(`${rule.label} presente (${count} archivos, ${pct.toFixed(0)}%)`, 'OK');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Arquitectura Clean (frontend)
// ─────────────────────────────────────────────────────────────────────────────
category('9. Arquitectura Clean del frontend');

const LAYERS_APP = [
  { dir: path.join(APP_SRC, 'domain', 'models'), label: 'domain/models' },
  { dir: path.join(APP_SRC, 'domain', 'ports'), label: 'domain/ports' },
  { dir: path.join(APP_SRC, 'application', 'services'), label: 'application/services' },
  { dir: path.join(APP_SRC, 'adapters', 'http'), label: 'adapters/http' },
  { dir: path.join(APP_SRC, 'adapters', 'mocks'), label: 'adapters/mocks' },
  { dir: path.join(APP_SRC, 'adapters', 'session'), label: 'adapters/session' },
  { dir: path.join(APP_SRC, 'app', 'routes'), label: 'app/routes' },
];

for (const layer of LAYERS_APP) {
  exists(layer.dir)
    ? pass(`Capa ${layer.label} existe`, 'OK', layer.dir)
    : fail(`Capa ${layer.label} existe`, 'FALTA capa', layer.dir);
}

// Regla de dependencia: packages/ui NO importa de apps/frontend.
const uiFiles = walk(UI_SRC, ['.ts', '.tsx']);
const uiLeaks = uiFiles.filter((f) => /from\s+['"].*apps\/frontend/.test(read(f)));
uiLeaks.length === 0
  ? pass('packages/ui no importa de apps/frontend (regla de dependencia Clean)', 'OK', UI_SRC)
  : fail(
      'packages/ui no importa de apps/frontend (regla de dependencia Clean)',
      `${uiLeaks.length} archivo(s) filtran hacia apps/frontend`,
      UI_SRC,
    );

// Regla de dependencia: modules/ NO hace fetch directo.
const moduleFiles = walk(MODULES_DIR, ['.tsx', '.ts']);
const directFetch = moduleFiles.filter((f) => {
  const c = read(f);
  if (!/\bfetch\s*\(|axios\./.test(c)) return false;
  if (/\.test\.|\.spec\./.test(f)) return false;
  return !/HttpClient|MockZentricApiAdapter/.test(c);
});
directFetch.length === 0
  ? pass('modules/ no hace fetch directo (consume hooks/adapters)', 'OK', MODULES_DIR)
  : fail(
      'modules/ no hace fetch directo (consume hooks/adapters)',
      `${directFetch.length} archivo(s): ${directFetch.slice(0, 5).map((f) => path.relative(REPO, f)).join(', ')}`,
    );

// ─────────────────────────────────────────────────────────────────────────────
// 10. Configuracion de compuertas
// ─────────────────────────────────────────────────────────────────────────────
category('10. Configuracion de las compuertas de calidad');

const VITEST = path.join(ROOT, 'apps', 'frontend', 'vitest.config.ts');
const PW = path.join(ROOT, 'apps', 'frontend', 'playwright.config.ts');
const LHCI = path.join(ROOT, 'apps', 'frontend', 'lighthouserc.json');
const PKG = path.join(ROOT, 'apps', 'frontend', 'package.json');

exists(VITEST) ? pass('vitest.config.ts existe', 'OK', VITEST) : fail('vitest.config.ts existe', 'FALTA', VITEST);
if (exists(VITEST)) {
  const c = read(VITEST);
  c.includes('vmThreads')
    ? pass('Vitest usa pool vmThreads (sin worker timeouts)', 'OK', VITEST)
    : fail('Vitest usa pool vmThreads (sin worker timeouts)', 'Falta pool: vmThreads', VITEST);
  c.includes('lines: 90') && c.includes('branches: 90')
    ? pass('Umbrales de cobertura 90% configurados', 'OK', VITEST)
    : fail('Umbrales de cobertura 90% configurados', 'Falta thresholds', VITEST);
}

exists(PW) ? pass('playwright.config.ts existe', 'OK', PW) : fail('playwright.config.ts existe', 'FALTA', PW);
if (exists(PW)) {
  const c = read(PW);
  c.includes('toHaveScreenshot')
    ? pass('Playwright tiene comparacion visual (snapshots)', 'OK', PW)
    : fail('Playwright tiene comparacion visual (snapshots)', 'Falta toHaveScreenshot', PW);
  ['chromium', 'firefox', 'webkit'].every((b) => c.includes(`'${b}'`))
    ? pass('Playwright cubre chromium + firefox + webkit', 'OK', PW)
    : fail('Playwright cubre chromium + firefox + webkit', 'Falta un navegador', PW);
}

exists(LHCI) ? pass('lighthouserc.json existe', 'OK', LHCI) : fail('lighthouserc.json existe', 'FALTA', LHCI);
if (exists(LHCI)) {
  const c = read(LHCI);
  c.includes('categories:accessibility')
    ? pass('Lighthouse asserta accesibilidad = 1.0', 'OK', LHCI)
    : fail('Lighthouse asserta accesibilidad = 1.0', 'Falta assert de accessibility', LHCI);
}

if (exists(PKG)) {
  const pkg = JSON.parse(read(PKG));
  const scripts = pkg.scripts ?? {};
  const REQUIRED = ['e2e', 'lighthouse', 'storybook', 'typecheck', 'test:run'];
  for (const s of REQUIRED) {
    scripts[s]
      ? pass(`package.json expone script "${s}"`, scripts[s], PKG)
      : fail(`package.json expone script "${s}"`, 'Script ausente', PKG);
  }
} else {
  fail('apps/frontend/package.json existe', 'FALTA', PKG);
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Specs del frontend presentes
// ─────────────────────────────────────────────────────────────────────────────
category('11. Specs del frontend (frontendSDD/)');

const SDD_DIR = path.join(REPO, 'frontendSDD');
if (!exists(SDD_DIR)) {
  fail('frontendSDD/ existe', `FALTA: ${SDD_DIR}`);
} else {
  const specs = fs.readdirSync(SDD_DIR).filter((f) => f.endsWith('.md'));
  pass(`frontendSDD/ contiene ${specs.length} documentos`, specs.join(', '), SDD_DIR);

  // §7 debe apuntar a §9 (trazabilidad). Si no, la compuerta valida una paleta muerta.
  const dsText = read(SPEC);
  const gateSection = dsText.split(/^## 7\./m)[1]?.split(/^## 8\./m)[0] ?? '';
  const gateMentions9 = /§?\s*9\.1|seccion 9|#9-addendum|Paleta Dual/i.test(gateSection);
  const gateHasOldPalette = /#0A0E1A|#111827|#00D4AA|#FFB800/.test(gateSection);
  if (gateHasOldPalette && !gateMentions9) {
    fail(
      '§7 (compuerta) marca trazabilidad hacia §9 (ADDENDUM Owner)',
      '§7 fila 1 sigue citando la paleta v1 sin referencia a §9, que es la norma vigente.',
      SPEC,
    );
  } else {
    pass('§7 (compuerta) marca trazabilidad hacia §9 (ADDENDUM Owner)', 'OK', SPEC);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────────────────────
function report() {
  console.log('\n' + '='.repeat(78));
  console.log('  AUDITORIA DE DESIGN SYSTEM - ZENTRIC');
  console.log('  Ley: frontendSDD/Frontend-Design-System.md §9 (ADDENDUM Owner)');
  console.log('='.repeat(78));

  let tp = 0;
  let tf = 0;
  let tw = 0;

  for (const cat of results) {
    const icon = cat.fail > 0 ? 'X' : cat.warn > 0 ? '!' : 'o';
    console.log(`\n[${icon}] ${cat.name}  --  ${cat.pass} ok, ${cat.fail} fallo(s), ${cat.warn} aviso(s)`);
    for (const c of cat.checks) {
      if (c.status === 'pass') continue;
      const mark = c.status === 'fail' ? '  FALLA' : '  AVISO';
      console.log(`${mark}: ${c.name}`);
      if (c.message) console.log(`         ${c.message}`);
    }
    tp += cat.pass;
    tf += cat.fail;
    tw += cat.warn;
  }

  console.log('\n' + '='.repeat(78));
  console.log(`  TOTAL  ${tp} ok  |  ${tf} fallo(s)  |  ${tw} aviso(s)`);
  console.log('='.repeat(78));

  if (tf > 0) {
    console.log('\n  ACCION REQUERIDA: hay fallos que bloquean el release.\n');
  } else if (tw > 0) {
    console.log('\n  Sin fallos bloqueantes. Revisar los avisos.\n');
  } else {
    console.log('\n  TODO VERDE: el frontend cumple la Ley §9.\n');
  }

  return tf;
}

const failedChecks = report();
process.exit(failedChecks > 0 ? 1 : 0);
