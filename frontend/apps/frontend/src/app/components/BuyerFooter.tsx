import { Link } from '@tanstack/react-router';
import { Logo, Skeleton } from '@zentric/ui';
import { useCategoriesQuery } from '../../core';
import {
  ShieldCheck,
  CreditCard,
  Headphones,
  FileText,
  Lock,
  Clock,
} from 'lucide-react';

export function BuyerFooter() {
  const { data: categories, isLoading: areCategoriesLoading } = useCategoriesQuery();

  return (
    <footer className="border-t border-border/80 bg-surface text-foreground transition-colors duration-200">
      {/* ── 1. Columnas Principales de Enlaces y Recursos ── */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Columna de Marca (2 slots en lg) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <Logo className="h-7" />
              <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand tracking-wide uppercase">
                Marketplace Oficial
              </span>
            </div>
            <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed max-w-sm">
              Plataforma centralizada de comercio electrónico con inventario físico garantizado,
              despacho seguro y protección de compra integral.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground-muted">
                <Lock className="h-3.5 w-3.5 text-brand" />
                Conexión Segura SSL
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground-muted">
                <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                Pagos Certificados
              </span>
            </div>
          </div>

          {/* Columna: Explorar Catálogo */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold tracking-wider uppercase text-foreground">
              Comprar
            </h5>
            <ul className="space-y-2 text-xs sm:text-sm text-foreground-muted">
              <li>
                <Link to="/buyer" className="hover:text-brand transition-colors">
                  Todo el Catálogo
                </Link>
              </li>
              {areCategoriesLoading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <li key={`category-skeleton-${index}`} aria-hidden="true">
                    <Skeleton className="h-3.5 w-32 rounded" />
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
                <Link to="/buyer" search={{ filter: 'ofertas' }} className="text-amber-600 hover:text-amber-700 font-semibold transition-colors">
                  Ofertas Destacadas
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna: Mi Cuenta y Soporte */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold tracking-wider uppercase text-foreground">
              Mi Cuenta
            </h5>
            <ul className="space-y-2 text-xs sm:text-sm text-foreground-muted">
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
                <a href="mailto:ayuda@zentric.local" className="flex items-center gap-1.5 text-foreground-muted hover:text-brand transition-colors">
                  <Headphones className="h-3.5 w-3.5 text-brand" />
                  Soporte al Comprador
                </a>
              </li>
            </ul>
          </div>

          {/* Columna: Confianza y Legal */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold tracking-wider uppercase text-foreground">
              Transparencia
            </h5>
            <ul className="space-y-2 text-xs sm:text-sm text-foreground-muted">
              <li className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-foreground-subtle" />
                <Link to="/legal" className="hover:text-brand transition-colors">
                  Aviso Legal y Estatuto
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-foreground-subtle" />
                <Link to="/terms" className="hover:text-brand transition-colors">
                  Términos y Condiciones
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-foreground-subtle" />
                <Link to="/privacy" className="hover:text-brand transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-foreground-subtle" />
                <Link to="/cookies" className="hover:text-brand transition-colors">
                  Ventana de Compra Protegida
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── 2. Barra Final de Derechos y Enlaces Institucionales ── */}
      <div className="border-t border-border/60 bg-surface-muted/30 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-foreground-muted">
          <div className="flex flex-wrap items-center gap-2">
            <p>© {new Date().getFullYear()} Zentric Marketplace. Todos los derechos reservados.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link to="/buyer" className="hover:text-brand transition-colors">
              Red de Bodegas Físicas
            </Link>
            <span>·</span>
            <Link to="/buyer/orders" className="hover:text-brand transition-colors">
              Despacho Verificado
            </Link>
            <span>·</span>
            <Link
              to="/acceso-corporativo"
              className="text-foreground-muted hover:text-brand transition-colors font-medium"
            >
              Portal Operativo (Vendedores y Logística)
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
