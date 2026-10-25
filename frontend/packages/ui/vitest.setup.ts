import '@testing-library/jest-dom/vitest';

// jsdom no implementa ResizeObserver. Los componentes shadcn montados sobre
// Radix (Select, Dialog) lo consultan al abrir el popper/portale y lanzarian
// en el entorno de test aunque el componente sea correcto.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom tampoco implementa la captura de puntero. Radix Select la usa en el
// gesto de apertura y lanza `target.hasPointerCapture is not a function`.
// Se espejan como no-op: no afectan a la logica que se esta probando.
if (typeof Element !== 'undefined' && !('hasPointerCapture' in Element.prototype)) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

// Radix Select hace scroll a la opcion enfocada al abrir; jsdom no implementa
// scrollIntoView y lanza `candidate?.scrollIntoView is not a function`.
if (typeof Element !== 'undefined' && !('scrollIntoView' in Element.prototype)) {
  Element.prototype.scrollIntoView = () => {};
}
