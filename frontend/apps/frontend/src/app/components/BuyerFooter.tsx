import { Link } from '@tanstack/react-router';
import { Logo, Skeleton } from '@zentric/ui';
import { useCategoriesQuery } from '../../application/services/catalog';
import { CatalogTrustStrip } from '../../modules/buyer/components/CatalogTrustStrip';
import {
  ShieldCheck,
  CreditCard,
  Headphones,
  FileText,
  Lock,
  Clock,
} from 'lucide-react';

export function BuyerFooter() {
  // S1: la columna "Comprar" enlaza las categorias reales que expone el
  // backend, la misma fuente que los chips del catalogo. Sin datos no se
  // inventa ninguna categoria: se reserva el espacio mientras carga.
  const { data: categories, isLoading: areCategoriesLoading } = useCategoriesQuery();

  return (
    <footer className="border-t border-border bg-surface text-foreground transition-colors duration-200">
      {/* ── 1. Franja de garantías (banda editorial compartida con el catálogo) ── */}
      <div className="border-b border-border/60 bg-surface-muted/40 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <CatalogTrustStrip />
        </div>
      </div>

      {/* ── 2. Columnas Principales de Enlaces y Recursos ── */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Columna de Marca (2 slots en lg) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <Logo className="h-7" />
              <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand tracking-wide uppercase">
                Marketplace Oficial
              </span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed max-w-sm">
              Plataforma transaccional de hardware de alto rendimiento, tecnología empresarial
              y licencias digitales. Conectamos inventarios físicos con compradores exigentes.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-mono text-foreground-muted">
                <Lock className="h-3.5 w-3.5 text-brand" />
                Conexión Segura SSL 256-bit
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-mono text-foreground-muted">
                <CreditCard className="h-3.5 w-3.5 text-success" />
                Pagos Certificados
              </span>
            </div>
          </div>

          {/* Columna: Explorar Catálogo */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold font-mono tracking-wider uppercase text-foreground">
              Comprar
            </h5>
            <ul className="space-y-2 text-xs text-foreground-muted">
              <li>
                <Link to="/buyer" className="hover:text-brand transition-colors">
                  Todo el Catálogo
                </Link>
              </li>
              {areCategoriesLoading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <li key={`category-skeleton-${index}`} aria-hidden="true">
                    <Skeleton className="h-3 w-32 rounded" />
                  </li>
                ))}
              {(categories ?? []).map((category) => (
                <li key={category.id}>
                  <Link
                    to="/buyer"
                    search={{ cat: category.id } as never}
                    className="hover:text-brand transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
              <li>
                {/* Usa el token `--warning` del tema y no un color crudo de Tailwind:
                    el ámbar crudo de la paleta por defecto (#F59E0B) no
                    alcanza el contraste AA sobre el lienzo claro y la
                    auditoría de accesibilidad lo marca. */}
                <Link to="/buyer" search={{ filter: 'ofertas' }} className="text-warning hover:text-warning/80 font-semibold transition-colors">
                  Ofertas Destacadas
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna: Mi Cuenta y Soporte */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold font-mono tracking-wider uppercase text-foreground">
              Mi Cuenta
            </h5>
            <ul className="space-y-2 text-xs text-foreground-muted">
              <li>
                <Link to="/buyer/orders" className="hover:text-brand transition-colors">
                  Mis Pedidos y Compras
                </Link>
              </li>
              <li>
                <Link to="/buyer/cart" className="hover:text-brand transition-colors">
                  Carrito Activo
                </Link>
              </li>
              <li>
                <Link to="/buyer/profile" className="hover:text-brand transition-colors">
                  Direcciones y Perfil
                </Link>
              </li>
              <li>
                <Link to="/buyer/returns/new" className="hover:text-brand transition-colors">
                  Solicitar Devolución
                </Link>
              </li>
              <li>
                <span className="flex items-center gap-1.5 text-foreground-muted">
                  <Headphones className="h-3.5 w-3.5 text-brand" />
                  Soporte: ayuda@zentric.local
                </span>
              </li>
            </ul>
          </div>

          {/* Columna: Confianza y Legal */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold font-mono tracking-wider uppercase text-foreground">
              Transparencia
            </h5>
            <ul className="space-y-2 text-xs text-foreground-muted">
              <li className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-foreground-subtle" />
                <span>Facturación DIAN / Split 95/5</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-foreground-subtle" />
                <span>Términos y Condiciones</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-foreground-subtle" />
                <span>Política de Privacidad</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-foreground-subtle" />
                <span>Ventana de Compra Protegida</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── 3. Barra Final de Derechos y Copyright ── */}
      <div className="border-t border-border bg-surface-muted/30 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-foreground-muted">
          <p>© {new Date().getFullYear()} Zentric Marketplace Inc. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Red de Bodegas Físicas</span>
            <span>·</span>
            <span>Despacho Verificado</span>
            <span>·</span>
            <span className="text-brand font-medium">zentric.me</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
