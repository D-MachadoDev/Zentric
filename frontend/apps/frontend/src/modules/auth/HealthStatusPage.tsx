import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useHealthQuery } from '../../application/services/health';
import {
  Button,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  Logo,
} from '@zentric/ui';
import {
  Activity,
  Database,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Server,
} from 'lucide-react';

/**
 * Pantalla de Estado y Telemetría del Sistema (Frontend-Role-Modules §2.1).
 * Expone la sonda técnica pública consumiendo GET /health.
 */
export function HealthStatusPage() {
  const { data: health, isLoading, isError, error, refetch, isFetching } = useHealthQuery();
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const handleRefresh = async () => {
    await refetch();
    setLastRefreshed(new Date());
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'healthy':
        return (
          <Badge className="bg-brand/20 text-brand border-brand/40 font-mono flex items-center gap-1.5 px-3 py-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            OPERACIONAL (HEALTHY)
          </Badge>
        );
      case 'degraded':
        return (
          <Badge className="bg-warning/20 text-warning border-warning/40 font-mono flex items-center gap-1.5 px-3 py-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            DEGRADADO (DEGRADED)
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/40 font-mono flex items-center gap-1.5 px-3 py-1">
            <XCircle className="h-3.5 w-3.5" />
            FUERA DE LÍNEA (UNHEALTHY)
          </Badge>
        );
    }
  };

  const getDbBadge = (dbStatus: string | undefined) => {
    const isUp = dbStatus === 'up';
    return (
      <Badge
        variant="outline"
        className={`font-mono text-xs px-2.5 py-0.5 ${
          isUp
            ? 'border-brand/40 text-brand bg-brand/10'
            : 'border-red-500/40 text-red-400 bg-red-500/10'
        }`}
      >
        {isUp ? 'CONECTADO (UP)' : 'DESCONECTADO (DOWN)'}
      </Badge>
    );
  };

  return (
    <div className="w-full max-w-4xl space-y-6 text-foreground my-4">
      {/* Encabezado */}
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                Telemetría y Estado de Infraestructura
              </h1>
              <p className="text-xs text-foreground-muted font-mono">
                Sonda de diagnóstico central · Zentric Marketplace API
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline" size="sm" className="border-border text-foreground-muted hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Volver al Acceso
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="bg-surface border border-border text-brand hover:bg-surface-muted"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Panel principal de estado */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl bg-surface" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Skeleton className="h-24 rounded-xl bg-surface" />
              <Skeleton className="h-24 rounded-xl bg-surface" />
              <Skeleton className="h-24 rounded-xl bg-surface" />
            </div>
          </div>
        ) : isError ? (
          <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
            <XCircle className="h-5 w-5 text-red-400" />
            <AlertTitle>Fallo de Conexión con la API</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : 'No se pudo contactar el endpoint /health. El servicio podría estar temporalmente inaccesible.'}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Tarjeta Dominante (Hero KPI Strip) */}
            <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-2xl">
              <div className="space-y-2">
                <span className="text-xs uppercase font-semibold tracking-wider text-foreground-muted font-mono">
                  Estado Global del Sistema
                </span>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-sans tracking-tight">
                    API Core v1.1.0
                  </h2>
                  {getStatusBadge(health?.status)}
                </div>
                <p className="text-xs text-foreground-muted">
                  Orquestación Hexagonal, Dispatcher de eventos y canal seguro de autorización activo.
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-1 font-mono text-xs text-foreground-muted tabular-nums">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-foreground-muted" />
                  <span>Último sondeo: {lastRefreshed.toLocaleTimeString()}</span>
                </div>
                <div>Timestamp API: {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'N/A'}</div>
              </div>
            </div>

            {/* Cuadrícula de Componentes de Infraestructura */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Tarjeta Base de Datos */}
              <div className="rounded-xl border border-border bg-surface/80 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <Database className="h-4 w-4 text-brand" />
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono">
                      PostgreSQL 16
                    </span>
                  </div>
                  {getDbBadge(health?.database)}
                </div>
                <p className="text-xs text-foreground-muted">
                  14 DbSets con modelos mapeados, migraciones al día y Unit of Work transaccional.
                </p>
              </div>

              {/* Tarjeta Pipeline y Handlers */}
              <div className="rounded-xl border border-border bg-surface/80 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <Server className="h-4 w-4 text-brand" />
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono">
                      Dispatcher CQRS
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs border-brand/40 text-brand bg-brand/10">
                    ACTIVO
                  </Badge>
                </div>
                <p className="text-xs text-foreground-muted">
                  Validaciones FluentValidation en pipeline antes de alcanzar los handlers de dominio.
                </p>
              </div>

              {/* Tarjeta Fondo Background Service */}
              <div className="rounded-xl border border-border bg-surface/80 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <Activity className="h-4 w-4 text-brand" />
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono">
                      Timeout Service
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs border-brand/40 text-brand bg-brand/10">
                    15 MIN RECOVERY
                  </Badge>
                </div>
                <p className="text-xs text-foreground-muted">
                  Barrido de carritos y recuperación de stock vencido con protección contra fallos.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
