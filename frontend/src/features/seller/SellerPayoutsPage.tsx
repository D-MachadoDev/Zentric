import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../app/providers/authContext';
import { appServices } from '../../app/providers/appServices';
import {
  Badge,
  Skeleton,
  MoneyAmount,
  Alert,
  AlertTitle,
  AlertDescription,
  Button,
} from '@zentric/ui';
import {
  Wallet,
  TrendingUp,
  ShoppingBag,
  History,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { getSellerPayoutsSummary, getSellerPayoutsHistory } from './sellerApi';
import type {
  PayoutSummaryPayload as PayoutSummary,
  BalanceMovementPayload as BalanceMovement,
} from './sellerApi';

const STORAGE_SUMMARY_KEY = 'zentric_seller_wallet_summary';
const STORAGE_MOVEMENTS_KEY = 'zentric_seller_wallet_movements';

/** Lee una clave de localStorage de forma segura (JSON inválido o ausente → null). */
function readStoredJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Página de Saldo y Billetera Comercial del Vendedor (/seller/pagos).
 * Modelo canónico Zentric: CERO formularios de bancos externos.
 * El saldo neto de ventas permanece como Crédito a Favor Zentric para reinversión y compras en el Marketplace.
 */
export function SellerPayoutsPage() {
  const auth = useContext(AuthContext);
  const session = auth?.session ?? appServices.session;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [summary, setSummary] = useState<PayoutSummary>({
    availableBalance: 0,
    totalSettledSales: 0,
    totalConvertedToCredit: 0,
    currency: 'COP',
  });

  const [movements, setMovements] = useState<BalanceMovement[]>([]);

  useEffect(() => {
    let isMounted = true;
    setLoadError(false);

    async function loadData() {
      setIsLoading(true);
      let hadRemoteError = false;
      try {
        const token = session.getAccessToken();
        let remoteSummary: PayoutSummary | null = null;
        let remoteMovements: BalanceMovement[] | null = null;

        try {
          remoteSummary = await getSellerPayoutsSummary(token);
        } catch {
          // Fallback a localStorage si la API aún no está disponible.
          hadRemoteError = true;
        }

        try {
          remoteMovements = await getSellerPayoutsHistory(token);
        } catch {
          // Fallback a localStorage si la API aún no está disponible.
          hadRemoteError = true;
        }

        const savedSummary = readStoredJson<PayoutSummary>(STORAGE_SUMMARY_KEY);
        const savedMovements = readStoredJson<BalanceMovement[]>(STORAGE_MOVEMENTS_KEY);

        if (isMounted) {
          if (remoteSummary) {
            setSummary(remoteSummary);
          } else if (savedSummary) {
            setSummary(savedSummary);
          }

          if (remoteMovements && remoteMovements.length > 0) {
            setMovements(remoteMovements);
          } else if (Array.isArray(savedMovements)) {
            setMovements(savedMovements);
          } else {
            setMovements([]);
          }

          if (hadRemoteError) setLoadError(true);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [session, reloadToken]);

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-8 w-64 bg-surface rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-36 rounded-2xl bg-surface" />
          <Skeleton className="h-36 rounded-2xl bg-surface" />
          <Skeleton className="h-36 rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {loadError && (
        <div className="space-y-3">
          <Alert variant="destructive" className="rounded-2xl border-destructive/40 bg-destructive/10 text-destructive">
            <AlertCircle className="size-5 text-destructive" />
            <AlertTitle>No se pudo sincronizar tu saldo</AlertTitle>
            <AlertDescription className="text-xs mt-0.5">
              Mostrando los últimos datos disponibles en este equipo. Reintenta para actualizar con el servidor.
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            pill
            onClick={() => setReloadToken((t) => t + 1)}
            className="rounded-full border-border text-foreground hover:bg-surface-muted"
          >
            <RefreshCw className="size-3.5 mr-1.5" /> Reintentar
          </Button>
        </div>
      )}

      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Wallet className="size-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Saldo y Billetera Comercial
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-foreground-muted">
            Crédito a favor neto liquidado de tus ventas para reinversión y compras dentro del marketplace Zentric.
          </p>
        </div>
      </div>

      {/* ── Tarjetas de Saldo y Métricas ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tarjeta Destacada: Crédito a Favor Zentric */}
        <div className="rounded-2xl border-2 border-success/30 bg-success/5 dark:bg-success/10 p-6 flex flex-col justify-between shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-success dark:text-success">
                Crédito a Favor Zentric
              </span>
              <div className="p-2 rounded-xl bg-success/20 text-success dark:text-success">
                <Wallet className="size-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
              <MoneyAmount amount={summary.availableBalance} currency={summary.currency} />
            </div>
          </div>
          <p className="text-[11px] text-foreground-muted mt-3">
            Neto liquidado disponible para gastar en el marketplace.
          </p>
        </div>

        {/* Tarjeta 2: Ventas Netas Liquidadas */}
        <div className="rounded-2xl border border-border/80 bg-surface p-6 flex flex-col justify-between shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                Ventas Netas Liquidadas
              </span>
              <div className="p-2 rounded-xl bg-brand/10 text-brand">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
              <MoneyAmount amount={summary.totalSettledSales} currency={summary.currency} />
            </div>
          </div>
          <p className="text-[11px] text-foreground-muted mt-3">
            Total histórico acumulado de ventas entregadas y liquidadas.
          </p>
        </div>

        {/* Tarjeta 3: Crédito Aplicado a Compras */}
        <div className="rounded-2xl border border-border/80 bg-surface p-6 flex flex-col justify-between shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                Crédito Aplicado a Compras
              </span>
              <div className="p-2 rounded-xl bg-info/10 text-info dark:text-info">
                <ShoppingBag className="size-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
              <MoneyAmount amount={summary.totalConvertedToCredit} currency={summary.currency} />
            </div>
          </div>
          <p className="text-[11px] text-foreground-muted mt-3">
            Monto reinvertido en compras y adquisiciones comerciales.
          </p>
        </div>
      </div>

      {/* ── Tabla de Movimientos de Saldo ───────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-surface overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="size-4 text-brand" />
            <h2 className="text-sm font-bold text-foreground">
              Historial de Movimientos de Saldo
            </h2>
          </div>
          <span className="text-xs text-foreground-muted">
            {movements.length} movimientos registrados
          </span>
        </div>

        {movements.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-foreground-muted">
            Aún no hay movimientos de saldo. Las liquidaciones de tus ventas aparecerán aquí cuando se acrediten.
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-surface-muted/30 text-foreground-muted uppercase text-[11px] tracking-wider font-semibold">
                <th className="px-6 py-3">Referencia / Concepto</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3 text-right">Monto</th>
                <th className="px-6 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {movements.map((mov) => {
                const isSettlement = mov.type === 'sale_settlement';
                return (
                  <tr key={mov.id} className="hover:bg-surface-muted/15 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{mov.concept}</div>
                      <div className="font-mono text-[11px] text-foreground-muted">{mov.reference}</div>
                    </td>
                    <td className="px-6 py-4 text-foreground-muted text-xs whitespace-nowrap">
                      {new Date(mov.date).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {isSettlement ? (
                        <Badge
                          variant="outline"
                          className="border-success/30 text-success dark:text-success bg-success/10 text-[11px] px-2 py-0.5 rounded-full font-semibold"
                        >
                          + Venta Liquidada
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-info/30 text-info dark:text-info bg-info/10 text-[11px] px-2 py-0.5 rounded-full font-semibold"
                        >
                          - Aplicación a Compras
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold whitespace-nowrap">
                      <span className={isSettlement ? 'text-success dark:text-success' : 'text-foreground'}>
                        {isSettlement ? '+ ' : '- '}
                        <MoneyAmount amount={mov.amount} currency="COP" />
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge
                        variant="outline"
                        className="border-border text-foreground-muted text-[11px] px-2 py-0.5 rounded-full"
                      >
                        {mov.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
