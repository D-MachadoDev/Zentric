import { describe, it, expect } from 'vitest';
import { generateSmartSku, VARIANT_PRESETS } from '../skuHelper';

describe('generateSmartSku', () => {
  it('generates standard SKU for agro example with lemons (Eureka / Taití)', () => {
    const eurekaSku = generateSmartSku('Limón Fresco', 'Eureka');
    expect(eurekaSku).toBe('LIM-FRE-EUR-01');

    const taitiSku = generateSmartSku('Limón', 'Taití');
    expect(taitiSku).toBe('LIM-TAI-01');
  });

  it('avoids collision with existing SKUs by incrementing suffix', () => {
    const existing = ['LIM-EUR-01', 'LIM-EUR-02'];
    const nextSku = generateSmartSku('Limón', 'Eureka', existing);
    expect(nextSku).toBe('LIM-EUR-03');
  });

  it('handles weights and numeric presentations correctly', () => {
    const sku1kg = generateSmartSku('Café Especial', '1 kg');
    expect(sku1kg).toBe('CAF-ESP-1KG-01');

    const sku500g = generateSmartSku('Café', '500g');
    expect(sku500g).toBe('CAF-500G-01');
  });

  it('filters Spanish stop words like "de", "la", "el", "con"', () => {
    const sku = generateSmartSku('Camisa de Lino con Botones', 'Azul');
    expect(sku).toBe('CAM-LIN-AZU-01');
  });

  it('handles empty or special character inputs gracefully with fallbacks', () => {
    const fallbackSku = generateSmartSku('', '');
    expect(fallbackSku).toBe('PROD-VAR-01');

    const onlyPunctuation = generateSmartSku('!!!', '???');
    expect(onlyPunctuation).toBe('PROD-VAR-01');
  });

  it('exposes rich variant presets with explanations for sellers', () => {
    expect(VARIANT_PRESETS.length).toBeGreaterThanOrEqual(5);
    const agroPreset = VARIANT_PRESETS.find((p) => p.name.includes('Variedad'));
    expect(agroPreset).toBeDefined();
    expect(agroPreset?.exampleDescription).toContain('Eureka');
  });
});
