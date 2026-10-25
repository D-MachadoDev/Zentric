import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type BrandRole = 'buyer' | 'seller' | 'admin' | 'logistics' | 'supervisor';

const VALID_ROLES = new Set<BrandRole>(['buyer', 'seller', 'admin', 'logistics', 'supervisor']);

export function getRoleLogoSrc(role: BrandRole = 'buyer'): string {
  return `/brandkit/logo/zentric-icon-${role}.png`;
}

/**
 * LogoMark — Renderiza directamente las imágenes oficiales del isotipo Zentric
 * almacenadas en `/brandkit/logo/zentric-icon-{role}.png` (sin trazos generados
 * por código SVG), cambiando automáticamente la imagen según el rol (`role` prop
 * o el contenedor `[data-role]` más cercano).
 */
export function LogoMark({ title, role, className, alt, ...props }: LogoMarkProps) {
  const isDecorative = title === undefined && alt === undefined;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [inheritedRole, setInheritedRole] = useState<BrandRole>('buyer');

  useEffect(() => {
    if (role) return;
    const el = imgRef.current;
    if (!el) return;

    const resolveClosestRole = (): BrandRole => {
      const closest = el.closest('[data-role]');
      const attr = closest?.getAttribute('data-role')?.toLowerCase() as BrandRole | undefined;
      return attr && VALID_ROLES.has(attr) ? attr : 'buyer';
    };

    setInheritedRole(resolveClosestRole());

    const closestContainer = el.closest('[data-role]') ?? el.ownerDocument?.body;
    if (!closestContainer || typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver(() => {
      setInheritedRole(resolveClosestRole());
    });
    observer.observe(closestContainer, {
      attributes: true,
      attributeFilter: ['data-role'],
      subtree: false,
    });

    return () => observer.disconnect();
  }, [role]);

  const effectiveRole: BrandRole = role ?? inheritedRole;
  const accessibleLabel = title ?? alt;

  return (
    <img
      ref={imgRef}
      src={getRoleLogoSrc(effectiveRole)}
      alt={accessibleLabel ?? ''}
      role={isDecorative ? 'presentation' : 'img'}
      aria-hidden={isDecorative || undefined}
      aria-label={accessibleLabel}
      data-testid="logo-mark"
      data-role={role && role !== 'buyer' ? role : undefined}
      draggable={false}
      className={cn('inline-block select-none object-contain', className)}
      {...props}
    />
  );
}

export interface LogoMarkProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'children' | 'role' | 'src'> {
  /**
   * Texto alternativo. Si se omite, la imagen se marca como decorativa: se usa
   * sólo cuando el nombre de la marca ya está visible al lado.
   */
  title?: string;
  /**
   * Rol opcional para seleccionar directamente la imagen `/brandkit/logo/zentric-icon-{role}.png`.
   */
  role?: BrandRole;
}
