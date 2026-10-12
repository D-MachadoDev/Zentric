import type { HealthStatus, ZentricApiPort } from '../../domain';

/**
 * Servicios transversales (Frontend-Domain-Services §3).
 */

export class VerificarEstadoServidorService {
  constructor(private readonly api: ZentricApiPort) {}

  /** `GET /health`. Un `5xx` lo traduce el adaptador a `ApiError` (§5). */
  ejecutar(): Promise<HealthStatus> {
    return this.api.getHealth();
  }
}

/**
 * Escapa un valor al formato CSV (RFC 4180): entrecomilla sólo lo que lo
 * necesita y duplica las comillas internas.
 */
function escaparCsv(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export class ExportarService {
  /**
   * Exporta un listado ya cargado a CSV (RFC 4180).
   *
   * No consulta el servidor ni aplica reglas: recibe las filas que la interfaz
   * ya tiene en memoria y devuelve el texto. La descarga como tal (blob) es un
   * detalle de presentación, no de esta capa.
   */
  ejecutar(filas: ReadonlyArray<Readonly<Record<string, unknown>>>): string {
    const primera = filas[0];
    if (primera === undefined) return '';

    const columnas = Object.keys(primera);
    const cuerpo = filas.map((fila) => columnas.map((columna) => escaparCsv(fila[columna])).join(','));

    return [columnas.join(','), ...cuerpo].join('\r\n');
  }
}
