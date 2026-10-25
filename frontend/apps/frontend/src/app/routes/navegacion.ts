/**
 * Navegación de página completa.
 *
 * Vive en su propio módulo porque `window.location.assign` es inforjable en
 * jsdom: no se puede espiar ni reemplazar en las pruebas. Aislándolo aquí, las
 * pruebas mockean este módulo y verifican el destino real de la navegación.
 */
export function navegarA(ruta: string): void {
  window.location.assign(ruta);
}
