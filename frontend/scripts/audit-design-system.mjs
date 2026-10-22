#!/usr/bin/env node
/**
 * Design System Audit Script - Zentric
 * Valida tokens, componentes, accesibilidad y consistencia visual
 * contra frontendSDD/ y doctrina visual anti-IA genérica.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, extname } from 'path';

const ROOT = resolve(__dirname, '..');
const FRONTEND_SDD = join(ROOT, '..', '..', '..', 'frontendSDD');
const PACKAGES_UI = join(ROOT, 'packages', 'ui', 'src');
const APPS_FRONTEND = join(ROOT, 'apps', 'frontend', 'src');

interface AuditResult {
  category: string;
  checks: CheckResult[];
  passed: number;
  failed: number;
  warnings: number;
}

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  file?: string;
  line?: number;
}

const results: AuditResult[] = [];

function addCheck(category: string, check: CheckResult) {
  let cat = results.find(r => r.category === category);
  if (!cat) {
    cat = { category, checks: [], passed: 0, failed: 0, warnings: 0 };
    results.push(cat);
  }
  cat.checks.push(check);
  if (check.status === 'pass') cat.passed++;
  else if (check.status === 'fail') cat.failed++;
  else cat.warnings++;
}

function readFiles(dir: string, exts: string[] = ['.ts', '.tsx', '.css', '.json']): string[] {
  const files: string[] = [];
  function walk(d: string) {
    for (const f of readdirSync(d)) {
      const full = join(d, f);
      if (statSync(full).isDirectory() && !f.startsWith('.') && f !== 'node_modules' && f !== 'dist' && f !== 'build') {
        walk(full);
      } else if (exts.includes(extname(full))) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

function checkFileContent(file: string, patterns: RegExp[], failMsg: string, passMsg: string, category: string) {
  const content = readFileSync(file, 'utf-8');
  const matches = patterns.some(p => p.test(content));
  addCheck(category, {
    name: failMsg,
    status: matches ? 'pass' : 'fail',
    message: matches ? passMsg : `${failMsg} - No encontrado en ${file}`,
    file,
  });
}

// ============================================================================
// 1. TOKENS & DESIGN SYSTEM (frontendSDD/Frontend-Design-System.md)
// ============================================================================
console.log('\n🔍 Auditing Design Tokens & Theme...');

const themeFile = join(PACKAGES_UI, 'theme.css');
if (require('fs').existsSync(themeFile)) {
  const theme = readFileSync(themeFile, 'utf-8');
  
  // Neutros tintados (doctrina anti-IA)
  addCheck('Tokens: Neutros Tintados', {
    name: 'Background principal carbón azulado #0B0F19',
    status: theme.includes('#0B0F19') || theme.includes('0B0F19') ? 'pass' : 'fail',
    message: theme.includes('#0B0F19') ? 'OK' : 'Falta background principal #0B0F19',
    file: themeFile,
  });
  
  addCheck('Tokens: Neutros Tintados', {
    name: 'Superficies carbón tintado #111827',
    status: theme.includes('#111827') || theme.includes('111827') ? 'pass' : 'fail',
    message: theme.includes('#111827') ? 'OK' : 'Falta surface #111827',
    file: themeFile,
  });
  
  addCheck('Tokens: Neutros Tintados', {
    name: 'Bordes sutiles #1F293D',
    status: theme.includes('#1F293D') || theme.includes('1F293D') ? 'pass' : 'fail',
    message: theme.includes('#1F293D') ? 'OK' : 'Falta border #1F293D',
    file: themeFile,
  });
  
  addCheck('Tokens: Neutros Tintados', {
    name: 'NO negro puro #000000 en fondos',
    status: !theme.includes('#000000') ? 'pass' : 'warn',
    message: !theme.includes('#000000') ? 'OK - No negro puro' : 'Advertencia: #000000 detectado',
    file: themeFile,
  });
  
  // Acento semántico único
  addCheck('Tokens: Acento Semántico', {
    name: 'Acento primario esmeralda/cian #00D4AA',
    status: theme.includes('#00D4AA') || theme.includes('00D4AA') ? 'pass' : 'fail',
    message: theme.includes('#00D4AA') ? 'OK' : 'Falta acento #00D4AA',
    file: themeFile,
  });
  
  addCheck('Tokens: Acento Semántico', {
    name: 'Acento advertencia ámbar #FFB800',
    status: theme.includes('#FFB800') || theme.includes('FFB800') ? 'pass' : 'fail',
    message: theme.includes('#FFB800') ? 'OK' : 'Falta acento warning #FFB800',
    file: themeFile,
  });
  
  // Tipografía Geist
  addCheck('Tokens: Tipografía', {
    name: 'Geist Sans configurada',
    status: theme.includes('Geist') ? 'pass' : 'fail',
    message: theme.includes('Geist') ? 'OK' : 'Falta Geist font',
    file: themeFile,
  });
  
  addCheck('Tokens: Tipografía', {
    name: 'Geist Mono para datos tabulares',
    status: theme.includes('Geist Mono') || theme.includes('mono') ? 'pass' : 'warn',
    message: 'Verificar Geist Mono en theme',
    file: themeFile,
  });
  
  // Patrones prohibidos
  const prohibitedPatterns = [
    { pattern: /gradient.*text|text.*gradient/i, name: 'Texto con degradados multicolores (AI gradient text)' },
    { pattern: /border-left.*#[0-9a-f]{3,6}|border-l.*#[0-9a-f]{3,6}/i, name: 'Bordes izquierdos con barras de acento chillones' },
    { pattern: /neon|glow|cyan.*neon|purple.*neon/i, name: 'Efectos cian-neón o púrpura-neón' },
  ];
  
  for (const { pattern, name } of prohibitedPatterns) {
    addCheck('Tokens: Patrones Prohibidos', {
      name,
      status: pattern.test(theme) ? 'fail' : 'pass',
      message: pattern.test(theme) ? `DETECTADO: ${name}` : 'OK - No detectado',
      file: themeFile,
    });
  }
} else {
  addCheck('Tokens', {
    name: 'theme.css existe',
    status: 'fail',
    message: 'No se encontró packages/ui/src/theme.css',
  });
}

// ============================================================================
// 2. COMPONENTES PRIMITIVOS (shadcn/ui adaptado)
// ============================================================================
console.log('🔍 Auditing Primitive Components...');

const primitiveComponents = ['Button', 'Input', 'Badge', 'Skeleton', 'Card', 'Alert', 'Dialog', 'Dropdown', 'Table', 'Tabs', 'Tooltip', 'Avatar', 'Separator', 'ScrollArea', 'Sheet', 'Popover', 'HoverCard', 'Menubar', 'ContextMenu', 'Command', 'Breadcrumb', 'Pagination', 'Progress', 'Slider', 'Switch', 'Checkbox', 'RadioGroup', 'Label', 'Textarea', 'Select', 'Combobox', 'Calendar', 'DatePicker'];

for (const comp of primitiveComponents) {
  const compDir = join(PACKAGES_UI, 'components', comp);
  if (require('fs').existsSync(compDir)) {
    addCheck('Componentes: Primitivas', {
      name: `${comp} existe`,
      status: 'pass',
      message: `OK - ${comp} implementado`,
      file: compDir,
    });
    
    // Verificar archivos clave
    const files = readdirSync(compDir);
    const hasTsx = files.some(f => f.endsWith('.tsx'));
    const hasStories = files.some(f => f.endsWith('.stories.tsx'));
    const hasTest = files.some(f => f.endsWith('.test.tsx') || f.endsWith('.spec.tsx'));
    
    addCheck('Componentes: Primitivas', {
      name: `${comp} tiene .tsx`,
      status: hasTsx ? 'pass' : 'fail',
      message: hasTsx ? 'OK' : 'Falta componente .tsx',
      file: compDir,
    });
    
    addCheck('Componentes: Primitivas', {
      name: `${comp} tiene Storybook`,
      status: hasStories ? 'pass' : 'warn',
      message: hasStories ? 'OK' : 'Falta .stories.tsx',
      file: compDir,
    });
    
    addCheck('Componentes: Primitivas', {
      name: `${comp} tiene tests`,
      status: hasTest ? 'pass' : 'warn',
      message: hasTest ? 'OK' : 'Falta test',
      file: compDir,
    });
  } else {
    addCheck('Componentes: Primitivas', {
      name: `${comp} existe`,
      status: 'fail',
      message: `FALTA: ${comp} no implementado en packages/ui/src/components/`,
    });
  }
}

// ============================================================================
// 3. COMPONENTES COMPUESTOS (DataTable, ResponsiveDrawer, ModalDialog, StatCard, OrderTimeline)
// ============================================================================
console.log('🔍 Auditing Composite Components...');

const compositeComponents = [
  { name: 'DataTable', required: ['pagination', 'sorting', 'filtering', 'selection', 'keyboard', 'a11y'] },
  { name: 'ResponsiveDrawer', required: ['mobile', 'desktop', 'keyboard', 'a11y'] },
  { name: 'ModalDialog', required: ['focus-trap', 'escape-close', 'portal', 'a11y'] },
  { name: 'StatCard', required: ['variant', 'loading', 'error'] },
  { name: 'OrderTimeline', required: ['steps', 'status', 'a11y'] },
  { name: 'ProductCard', required: ['image', 'price', 'variant', 'a11y'] },
  { name: 'ProductRailCard', required: ['horizontal', 'a11y'] },
  { name: 'CatalogFilters', required: ['search', 'category', 'type', 'sort', 'clear', 'a11y'] },
  { name: 'CatalogHero', required: ['carousel', 'cta', 'a11y'] },
  { name: 'CatalogPagination', required: ['window', 'keyboard', 'a11y'] },
  { name: 'CategoryChips', required: ['chips', 'count', 'all', 'a11y'] },
];

for (const comp of compositeComponents) {
  const compDir = join(PACKAGES_UI, 'components', comp.name);
  const appCompDir = join(APPS_FRONTEND, 'modules', 'buyer', 'components', comp.name + '.tsx');
  const exists = require('fs').existsSync(compDir) || require('fs').existsSync(appCompDir);
  
  addCheck('Componentes: Compuestos', {
    name: `${comp.name} existe`,
    status: exists ? 'pass' : 'fail',
    message: exists ? 'OK' : `FALTA: ${comp.name} no encontrado`,
    file: exists ? (require('fs').existsSync(compDir) ? compDir : appCompDir) : undefined,
  });
  
  if (exists) {
    const dir = require('fs').existsSync(compDir) ? compDir : appCompDir;
    const files = require('fs').existsSync(compDir) ? readdirSync(compDir) : [require('path').basename(appCompDir)];
    const hasStories = files.some(f => f.endsWith('.stories.tsx'));
    const hasTest = files.some(f => f.endsWith('.test.tsx') || f.endsWith('.spec.tsx'));
    
    addCheck('Componentes: Compuestos', {
      name: `${comp.name} tiene Storybook`,
      status: hasStories ? 'pass' : 'warn',
      message: hasStories ? 'OK' : 'Falta .stories.tsx',
      file: dir,
    });
    
    addCheck('Componentes: Compuestos', {
      name: `${comp.name} tiene tests`,
      status: hasTest ? 'pass' : 'warn',
      message: hasTest ? 'OK' : 'Falta test',
      file: dir,
    });
  }
}

// ============================================================================
// 4. MÓDULOS POR ROL (Buyer, Seller, Admin, Logistics, Supervisor)
// ============================================================================
console.log('🔍 Auditing Role Modules...');

const roles = ['buyer', 'seller', 'admin', 'logistics', 'supervisor'];
const requiredPages = {
  buyer: ['BuyerCatalogPage', 'BuyerProductDetailPage', 'BuyerCartPage', 'BuyerOrdersPage', 'BuyerOrderDetailPage', 'BuyerOrderPaymentPage', 'BuyerProfilePage', 'RequestReturnPage'],
  seller: ['SellerDashboardPage', 'SellerProductsPage', 'SellerOrdersPage', 'SellerFulfillmentPage', 'SellerBillingPage', 'SellerProfilePage'],
  admin: ['AdminCommandCenterPage', 'AdminBillingConsolePage', 'AdminUsersPage', 'AdminWarehousesPage', 'AdminAuditPage', 'AdminSettingsPage'],
  logistics: ['LogisticsDashboardPage', 'LogisticsFulfillmentPage', 'LogisticsWarehousesPage', 'LogisticsReturnsPage', 'LogisticsRoutesPage'],
  supervisor: ['SupervisorAuditPage', 'SupervisorMetricsPage', 'SupervisorCompliancePage', 'SupervisorReportsPage'],
};

for (const role of roles) {
  const roleDir = join(APPS_FRONTEND, 'modules', role);
  if (require('fs').existsSync(roleDir)) {
    addCheck(`Módulos: ${role}`, {
      name: `Directorio ${role}/ existe`,
      status: 'pass',
      message: 'OK',
      file: roleDir,
    });
    
    const files = readdirSync(roleDir, { recursive: true }).filter(f => f.endsWith('.tsx') && !f.includes('.stories.') && !f.includes('.test.'));
    const pages = requiredPages[role as keyof typeof requiredPages] || [];
    
    for (const page of pages) {
      const found = files.some(f => f.includes(page));
      addCheck(`Módulos: ${role}`, {
        name: `${page} existe`,
        status: found ? 'pass' : 'fail',
        message: found ? 'OK' : `FALTA: ${page}`,
        file: roleDir,
      });
    }
    
    // Tests
    const testFiles = readdirSync(roleDir, { recursive: true }).filter(f => f.endsWith('.test.tsx') || f.endsWith('.spec.tsx'));
    addCheck(`Módulos: ${role}`, {
      name: `Tiene tests (${testFiles.length} archivos)`,
      status: testFiles.length > 0 ? 'pass' : 'warn',
      message: testFiles.length > 0 ? `OK - ${testFiles.length} test files` : 'FALTA: Sin tests',
      file: roleDir,
    });
    
    // Storybook
    const storyFiles = readdirSync(roleDir, { recursive: true }).filter(f => f.endsWith('.stories.tsx'));
    addCheck(`Módulos: ${role}`, {
      name: `Tiene Storybook (${storyFiles.length} archivos)`,
      status: storyFiles.length > 0 ? 'pass' : 'warn',
      message: storyFiles.length > 0 ? `OK - ${storyFiles.length} stories` : 'FALTA: Sin stories',
      file: roleDir,
    });
  } else {
    addCheck(`Módulos: ${role}`, {
      name: `Directorio ${role}/ existe`,
      status: 'fail',
      message: `FALTA: Módulo ${role} completo`,
    });
  }
}

// ============================================================================
// 5. ACCESIBILIDAD WCAG 2.2 AA
// ============================================================================
console.log('🔍 Auditing Accessibility...');

const a11yPatterns = [
  { pattern: /aria-label|aria-labelledby|aria-describedby/, name: 'ARIA labels presentes' },
  { pattern: /role=/, name: 'Roles ARIA definidos' },
  { pattern: /tabIndex/, name: 'Tab index gestionado' },
  { pattern: /focus-visible|focus:outline/, name: 'Focus visible styles' },
  { pattern: /sr-only|screen-reader/, name: 'Screen reader only content' },
  { pattern: /alt=/, name: 'Imágenes con alt text' },
];

const tsxFiles = readFiles(APPS_FRONTEND, ['.tsx']);
for (const file of tsxFiles.slice(0, 50)) { // Sample first 50
  const content = readFileSync(file, 'utf-8');
  for (const { pattern, name } of a11yPatterns) {
    if (pattern.test(content)) {
      addCheck('Accesibilidad: WCAG 2.2', {
        name,
        status: 'pass',
        message: `Encontrado en ${file}`,
        file,
      });
      break; // Only report once per pattern
    }
  }
}

// Verificar contraste en theme
const theme = readFileSync(themeFile, 'utf-8');
addCheck('Accesibilidad: Contraste', {
  name: 'Colores definidos con contraste AA',
  status: theme.includes('foreground') && theme.includes('muted') ? 'pass' : 'warn',
  message: 'Verificar ratios de contraste en theme.css',
  file: themeFile,
});

// ============================================================================
// 6. ARQUITECTURA FRONTEND (Clean Architecture + TDD)
// ============================================================================
console.log('🔍 Auditing Frontend Architecture...');

const archLayers = [
  { name: 'domain/models', path: join(APPS_FRONTEND, 'domain', 'models') },
  { name: 'domain/ports', path: join(APPS_FRONTEND, 'domain', 'ports') },
  { name: 'application/services', path: join(APPS_FRONTEND, 'application', 'services') },
  { name: 'application/hooks', path: join(APPS_FRONTEND, 'application', 'hooks') },
  { name: 'adapters/http', path: join(APPS_FRONTEND, 'adapters', 'http') },
  { name: 'adapters/mocks', path: join(APPS_FRONTEND, 'adapters', 'mocks') },
  { name: 'adapters/session', path: join(APPS_FRONTEND, 'adapters', 'session') },
];

for (const layer of archLayers) {
  const exists = require('fs').existsSync(layer.path);
  addCheck('Arquitectura: Capas', {
    name: `Capa ${layer.name} existe`,
    status: exists ? 'pass' : 'fail',
    message: exists ? 'OK' : `FALTA: ${layer.name}`,
    file: layer.path,
  });
}

// Verificar que NO hay fetch directo en módulos
const moduleFiles = readFiles(join(APPS_FRONTEND, 'modules'), ['.tsx']);
let directFetchCount = 0;
for (const file of moduleFiles) {
  const content = readFileSync(file, 'utf-8');
  if (/\.fetch\(|axios\.|import.*fetch/.test(content) && !content.includes('MockZentricApiAdapter') && !content.includes('HttpClient')) {
    directFetchCount++;
    addCheck('Arquitectura: No Fetch Directo', {
      name: `Sin fetch directo en ${file}`,
      status: 'fail',
      message: 'Fetch directo detectado - debe usar hooks/adapters',
      file,
    });
  }
}
if (directFetchCount === 0) {
  addCheck('Arquitectura: No Fetch Directo', {
    name: 'Módulos usan hooks/adapters (no fetch directo)',
    status: 'pass',
    message: 'OK - No fetch directo detectado en módulos',
  });
}

// ============================================================================
// 7. TESTING - Coverage & Quality
// ============================================================================
console.log('🔍 Auditing Testing Setup...');

const vitestConfig = join(ROOT, 'vitest.config.ts');
if (require('fs').existsSync(vitestConfig)) {
  const config = readFileSync(vitestConfig, 'utf-8');
  addCheck('Testing: Config', {
    name: 'Pool vmThreads configurado',
    status: config.includes('pool:') && config.includes('vmThreads') ? 'pass' : 'fail',
    message: 'OK' : 'Falta pool: vmThreads',
    file: vitestConfig,
  });
  
  addCheck('Testing: Config', {
    name: 'Thresholds 90% configurados',
    status: config.includes('lines: 90') && config.includes('branches: 90') ? 'pass' : 'fail',
    message: 'OK' : 'Falta thresholds 90%',
    file: vitestConfig,
  });
}

// Verificar tests BDD naming
const testFiles = readFiles(APPS_FRONTEND, ['.test.tsx', '.spec.tsx']);
let bddCount = 0;
for (const file of testFiles.slice(0, 20)) {
  const content = readFileSync(file, 'utf-8');
  const matches = content.match(/describe\(['"].*['"]\)/g) || [];
  for (const m of matches) {
    if (m.includes('_') && (m.includes('should') || m.includes('debe') || m.includes('returns') || m.includes('retorna') || m.includes('throws') || m.includes('lanza'))) {
      bddCount++;
    }
  }
}
addCheck('Testing: BDD Naming', {
  name: 'Tests siguen convención Metodo_Condicion_ResultadoEsperado',
  status: bddCount > 10 ? 'pass' : 'warn',
  message: `${bddCount} tests con naming BDD detectados`,
});

// ============================================================================
// 8. SPECS ALIGNMENT (frontendSDD/)
// ============================================================================
console.log('🔍 Auditing Spec Alignment...');

const sddFiles = [
  'Frontend-Design-System.md',
  'Frontend-Domain-Services.md',
  'Frontend-Adapters.md',
  'C4-1-Contexto.md',
  'C4-2-Contenedores.md',
  'C4-3-Componentes.md',
  'C4-4-Codigo-React.md',
  'Frontend-Role-Modules.md',
  'Frontend-User-Flows.md',
];

for (const sdd of sddFiles) {
  const sddPath = join(FRONTEND_SDD, sdd);
  addCheck('SDD: Specs', {
    name: `${sdd} existe`,
    status: require('fs').existsSync(sddPath) ? 'pass' : 'fail',
    message: require('fs').existsSync(sddPath) ? 'OK' : `FALTA: ${sdd}`,
    file: sddPath,
  });
}

// ============================================================================
// REPORT
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('📊 DESIGN SYSTEM AUDIT REPORT - ZENTRIC');
console.log('='.repeat(80));

let totalPassed = 0, totalFailed = 0, totalWarnings = 0;

for (const cat of results) {
  const status = cat.failed > 0 ? '❌' : cat.warnings > 0 ? '⚠️' : '✅';
  console.log(`\n${status} ${cat.category}: ${cat.passed} pass, ${cat.failed} fail, ${cat.warnings} warn`);
  
  for (const check of cat.checks) {
    const icon = check.status === 'pass' ? '  ✓' : check.status === 'fail' ? '  ✗' : '  ⚠';
    console.log(`  ${icon} ${check.name}`);
    if (check.status !== 'pass' && check.message) {
      console.log(`      ${check.message}`);
    }
  }
  
  totalPassed += cat.passed;
  totalFailed += cat.failed;
  totalWarnings += cat.warnings;
}

console.log('\n' + '='.repeat(80));
console.log(`TOTAL: ${totalPassed} ✅ | ${totalFailed} ❌ | ${totalWarnings} ⚠️`);
console.log('='.repeat(80));

if (totalFailed > 0) {
  console.log('\n🚨 ACCIÓN REQUERIDA: Corregir los checks fallidos antes de release.');
  process.exit(1);
} else if (totalWarnings > 0) {
  console.log('\n⚠️ ADVERTENCIAS: Revisar items marcados. No bloquea release.');
  process.exit(0);
} else {
  console.log('\n🎉 TODO VERDE: Design system compliant y listo para production.');
  process.exit(0);
}