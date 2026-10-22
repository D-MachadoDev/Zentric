# Zentric Brandkit

Assets de marca generados automáticamente siguiendo la **doctrina visual anti-IA genérica**.

## 🎨 Paleta de Colores

### Neutros Tintados (Obligatorios)
| Token | Hex | Uso |
|-------|-----|-----|
| `--color-bg-primary` | `#0B0F19` | Background principal |
| `--color-bg-surface` | `#111827` | Superficies/tarjetas |
| `--color-bg-elevated` | `#161F30` | Modales/elevados |
| `--color-border-subtle` | `#1F293D` | Bordes |
| `--color-border-focus` | `#00D4AA` | Focus rings |

### Acentos Semánticos (Únicos)
| Token | Hex | Uso |
|-------|-----|-----|
| `--color-accent-primary` | `#00D4AA` | **Acción primaria** (botones, links, focus) |
| `--color-accent-warning` | `#FFB800` | Advertencia/atención |
| `--color-accent-danger` | `#EF4444` | Error/peligro |
| `--color-accent-info` | `#3B82F6` | Información |

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

```
brandkit/
├── design-tokens.json
├── variables.css
├── tailwind.zentric.ts
├── logo/
│   ├── zentric-wordmark.svg
│   ├── zentric-icon.svg
│   └── zentric-horizontal.svg
├── favicon/
│   ├── favicon-16x16.png ... favicon-512x512.png
│   ├── apple-touch-icon-180x180.png
│   └── favicon.html
├── manifest.json
├── og/template.html
└── README.md
```

## 🚀 Uso

### En Tailwind
```ts
import zentric from './brandkit/tailwind.zentric.ts';
export default { ...zentric }
```

### En CSS Global
```css
@import '/brandkit/variables.css';
```

### Favicon en index.html
Copiar contenido de favicon.html al <head>

## ✅ Checklist de Cumplimiento
- [ ] Neutros tintados (no grises muertos, no #000000)
- [ ] Un solo acento primario (#00D4AA)
- [ ] Tipografía Geist Sans + Geist Mono
- [ ] Contraste WCAG 2.2 AA
- [ ] Focus visible en todos los interactivos
- [ ] Sin patrones prohibidos
