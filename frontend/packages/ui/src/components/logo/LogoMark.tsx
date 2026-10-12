import type { SVGProps } from 'react';

/**
 * LogoMark (Q6-D: "Z + Órbita/Centro").
 *
 * Concepto: la `Z` es el centro de gravedad del sistema; a su alrededor giran
 * dos órbitas con nodos que representan las entidades del dominio (productos,
 * bodegas, pedidos) bajo su control. Se lee como "el centro del comercio".
 *
 * Recurso gráfico propio generado en el repositorio. Prohibido material de
 * terceros (Frontend-Design-System.md seccion 9).
 */
export function LogoMark({ title, ...props }: LogoMarkProps) {
  const isDecorative = title === undefined;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      role={isDecorative ? 'presentation' : 'img'}
      aria-hidden={isDecorative || undefined}
      aria-label={title}
      data-testid="logo-mark"
      {...props}
    >
      {/* Órbita descendente. Trazo fino: es soporte, no protagonista. */}
      <ellipse
        cx="16"
        cy="16"
        rx="13"
        ry="5.6"
        transform="rotate(-24 16 16)"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.55"
      />
      {/* Órbita ascendente: cruza la primera y encierra a la Z. */}
      <ellipse
        cx="16"
        cy="16"
        rx="13"
        ry="5.6"
        transform="rotate(24 16 16)"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.3"
      />

      {/* Nodos en extremos opuestos: lectura de movimiento orbital. */}
      <circle cx="27.9" cy="21.3" r="2.1" fill="currentColor" />
      <circle cx="4.1" cy="10.7" r="2.1" fill="currentColor" />

      {/* La Z, centro de gravedad. Trazo grueso para que sobreviva a 16 px. */}
      <path
        d="M10.4 11.2h11.2L11.6 20.8h10"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface LogoMarkProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /**
   * Texto alternativo. Si se omite, el SVG se marca como decorativo: se usa
   * sólo cuando el nombre de la marca ya está visible al lado.
   */
  title?: string;
}
