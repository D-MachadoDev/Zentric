import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { beforeEach } from 'vitest';

// Bajo ejecución paralela intensa (19 workers concurrentes en Windows),
// 1000ms por defecto puede causar fallos esporádicos en waitFor / findBy*.
configure({ asyncUtilTimeout: 4000 });

beforeEach(() => {
  try {
    window.localStorage?.clear();
  } catch {
    // Entornos sin storage
  }
});

/**
 * Stubs para las APIs del navegador que jsdom no implementa.
 *
 * Radix (`Select`, `AlertDialog`) las usa para medir y capturar el puntero. Sin
 * ellas el componente abre a medias o lanza al enfocar una opción, y el fallo
 * parece un problema del código de la app cuando es del entorno de prueba.
 */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = globalThis.ResizeObserver ?? ResizeObserverStub;

Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

