import { describe, expect, it, vi } from 'vitest';
import { AlertAdapter } from '../AlertAdapter';
import type { AvisoAlerta, ConfirmacionAlerta } from '../AlertAdapter';

/**
 * `AlertPort` (Frontend-Adapters §5).
 *
 * El adaptador no pinta: sólo decide y resuelve. Estas pruebas fijan el
 * contrato que la UI depende: nunca quedarse con una promesa colgada y nunca
 * poder voltear una respuesta ya dada.
 */
function crearHost() {
  const avisos: AvisoAlerta[] = [];
  const confirmaciones: ConfirmacionAlerta[] = [];

  const adapter = new AlertAdapter();
  adapter.bind({
    mostrarAviso: (aviso) => avisos.push(aviso),
    abrirConfirmacion: (confirmacion) => confirmaciones.push(confirmacion),
  });

  return { adapter, avisos, confirmaciones };
}

describe('AlertAdapter', () => {
  it('reparte el aviso al host y resuelve de inmediato', async () => {
    const { adapter, avisos } = crearHost();

    await adapter.show('success', 'Bodega registrada', 'Queda disponible de inmediato.');

    expect(avisos).toEqual([
      { kind: 'success', title: 'Bodega registrada', message: 'Queda disponible de inmediato.' },
    ]);
  });

  it('devuelve true cuando el usuario confirma', async () => {
    const { adapter, confirmaciones } = crearHost();

    const promesa = adapter.confirm('Reembolsar', 'Se acreditará el dinero al comprador.');
    expect(confirmaciones).toHaveLength(1);

    confirmaciones[0]?.cerrar(true);

    await expect(promesa).resolves.toBe(true);
  });

  it('devuelve false cuando el usuario cancela', async () => {
    const { adapter, confirmaciones } = crearHost();

    const promesa = adapter.confirm('Reembolsar', 'Se acreditará el dinero.');
    confirmaciones[0]?.cerrar(false);

    await expect(promesa).resolves.toBe(false);
  });

  it('una segunda confirmación cancela la primera en vez de dejarla colgada', async () => {
    const { adapter, confirmaciones } = crearHost();

    const primera = adapter.confirm('Primera', '¿Seguro?');
    const segunda = adapter.confirm('Segunda', '¿Seguro?');

    await expect(primera).resolves.toBe(false);

    confirmaciones[1]?.cerrar(true);
    await expect(segunda).resolves.toBe(true);
  });

  it('sin host montado una confirmación se resuelve false, nunca queda pendiente', async () => {
    const adapter = new AlertAdapter();

    await expect(adapter.confirm('Reembolsar', '¿Seguro?')).resolves.toBe(false);
  });

  it('tras desenlazar el host, la confirmación vuelve a resolverse false', async () => {
    const adapter = new AlertAdapter();
    const abrirConfirmacion = vi.fn();
    const desenlazar = adapter.bind({ mostrarAviso: vi.fn(), abrirConfirmacion });

    desenlazar();

    await expect(adapter.confirm('Reembolsar', '¿Seguro?')).resolves.toBe(false);
    // Nadie está escuchando: no se intenta abrir un diálogo que nadie vería.
    expect(abrirConfirmacion).not.toHaveBeenCalled();
  });

  it('el cierre tardío del diálogo no voltea la respuesta ya dada', async () => {
    const { adapter, confirmaciones } = crearHost();

    const promesa = adapter.confirm('Reembolsar', '¿Seguro?');
    // La elección del usuario llega primero…
    confirmaciones[0]?.cerrar(true);
    // …y después Radix dispara `onOpenChange(false)` al cerrar el diálogo.
    confirmaciones[0]?.cerrar(false);

    await expect(promesa).resolves.toBe(true);
  });

  it('soporta sobrecargas basadas en objetos para show y confirm (incluyendo variant danger)', async () => {
    const { adapter, avisos, confirmaciones } = crearHost();

    await adapter.show({
      title: 'Fallo crítico',
      description: 'No se pudo procesar.',
      variant: 'danger',
    });
    await adapter.show({
      title: 'Operación exitosa',
      variant: 'success',
    });

    expect(avisos).toEqual([
      { kind: 'error', title: 'Fallo crítico', message: 'No se pudo procesar.' },
      { kind: 'success', title: 'Operación exitosa', message: undefined },
    ]);

    const promesa = adapter.confirm({
      title: 'Anular factura',
      description: '¿Confirmar anulación?',
      confirmLabel: 'Anular ahora',
      variant: 'destructive',
    });

    expect(confirmaciones[0]).toMatchObject({
      title: 'Anular factura',
      message: '¿Confirmar anulación?',
      confirmLabel: 'Anular ahora',
      variant: 'destructive',
    });
    confirmaciones[0]?.cerrar(true);
    await expect(promesa).resolves.toBe(true);
  });
});
