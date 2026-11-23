/**
 * Utilidades para generación automática de SKU y plantillas de variantes comerciales.
 * Diseñado para simplificar la creación de variantes a vendedores sin conocimientos técnicos de inventario.
 */

const STOP_WORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'con',
  'en',
  'por',
  'para',
  'sin',
  'y',
  'o',
  'the',
  'of',
  'and',
  'with',
]);

/**
 * Normaliza un texto eliminando acentos, caracteres especiales y convirtiéndolo en token alfanumérico limpio.
 */
function cleanText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar diacríticos / tildes
    .replace(/(\d+)\s+([a-zA-Z]+)/g, '$1$2') // Combinar número y unidad: "1 kg" -> "1kg", "500 ml" -> "500ml"
    .replace(/[^a-zA-Z0-9\s]/g, '') // Solo alfanumérico y espacios
    .trim();
}

/**
 * Extrae una abreviatura de 3 a 6 caracteres a partir de un nombre compuesto o simple.
 * Ejemplos:
 *  "Limón" -> "LIM"
 *  "Limón Tahití" -> "LIM-TAH"
 *  "Café Molido Gourmet" -> "CAF-MOL"
 */
function extractToken(text: string, maxWords = 2, maxCharsPerWord = 3): string {
  const cleaned = cleanText(text);
  if (!cleaned) return '';

  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()));

  if (words.length === 0) {
    // Si todas eran stop words, usar la primera palabra limpia
    const fallbackWords = cleaned.split(/\s+/).filter(Boolean);
    return (fallbackWords[0] || 'ITM').substring(0, 4).toUpperCase();
  }

  return words
    .slice(0, maxWords)
    .map((word) => {
      // Si la palabra contiene números (ej. 1kg, 500g, 2tb), conservar compacta
      if (/\d/.test(word)) {
        return word.toUpperCase();
      }
      return word.substring(0, maxCharsPerWord).toUpperCase();
    })
    .join('-');
}

/**
 * Genera un código SKU inteligente, único y legible a partir del nombre del producto y el valor de la variante.
 *
 * @param productName Nombre comercial del producto (ej. "Limones Frescos").
 * @param variantValue Valor de la variante (ej. "Eureka", "Taití", "1 kg").
 * @param existingSkus Lista de SKUs existentes para evitar colisiones.
 * @returns SKU estandarizado como "LIM-EUR-01" o "LIM-TAI-02".
 */
export function generateSmartSku(
  productName: string,
  variantValue: string,
  existingSkus: string[] = [],
): string {
  const prodToken = extractToken(productName, 2, 3) || 'PROD';
  const varToken = extractToken(variantValue, 2, 3) || 'VAR';

  const baseSku = `${prodToken}-${varToken}`;
  const normalizedExisting = new Set(
    existingSkus.filter(Boolean).map((s) => s.trim().toUpperCase()),
  );

  let counter = 1;
  let candidate = `${baseSku}-${String(counter).padStart(2, '0')}`;

  while (normalizedExisting.has(candidate)) {
    counter += 1;
    candidate = `${baseSku}-${String(counter).padStart(2, '0')}`;
  }

  return candidate;
}

export interface VariantPreset {
  name: string;
  sampleValue: string;
  categoryHint: string;
  exampleDescription: string;
}

export const VARIANT_PRESETS: VariantPreset[] = [
  {
    name: 'Variedad / Tipo',
    sampleValue: 'Eureka',
    categoryHint: 'Agro, Frutas y Alimentos',
    exampleDescription: 'Ideal si vendes frutas, café o cosechas. Ej: Limón Eureka, Limón Taití, Café Arábica.',
  },
  {
    name: 'Presentación / Peso',
    sampleValue: '1 kg',
    categoryHint: 'Despensa y Granel',
    exampleDescription: 'Para cantidades o empaques. Ej: 500g, 1 kg, Bulto 25kg, Pack x6 unidades.',
  },
  {
    name: 'Tamaño / Calibre',
    sampleValue: 'Mediano',
    categoryHint: 'Cereales, Frutas y Verduras',
    exampleDescription: 'Para clasificar por tamaño físico. Ej: Pequeño, Mediano, Grande, Extra.',
  },
  {
    name: 'Color',
    sampleValue: 'Verde',
    categoryHint: 'Moda y Hogar',
    exampleDescription: 'Para ropa, accesorios o acabados. Ej: Negro, Blanco, Azul Marino, Verde.',
  },
  {
    name: 'Talla',
    sampleValue: 'M',
    categoryHint: 'Prendas y Calzado',
    exampleDescription: 'Para tallaje de confección o zapatos. Ej: S, M, L, XL, 38, 40, 42.',
  },
  {
    name: 'Capacidad / Almacenamiento',
    sampleValue: '256GB',
    categoryHint: 'Tecnología',
    exampleDescription: 'Para electrónica o repuestos. Ej: 128GB, 256GB, 1TB.',
  },
];
