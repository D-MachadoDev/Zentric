import { Shield, Activity } from 'lucide-react';

interface OperationalFooterProps {
  roleLabel?: string;
}

export function OperationalFooter({ roleLabel = 'Consola Operativa' }: OperationalFooterProps) {
  return (
    <footer className="border-t border-border bg-surface px-4 py-3 sm:px-6 text-xs text-foreground-muted">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground font-mono text-[11px]">
            Zentric Platform
          </span>
          <span className="text-foreground-subtle">·</span>
          <span className="text-[11px] font-mono text-brand font-medium">
            {roleLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <Activity className="h-3 w-3 inline" />
            En Línea
          </span>
          <span className="text-foreground-subtle">·</span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-foreground-muted" />
            Sesión Segura RBAC
          </span>
          <span className="text-foreground-subtle">·</span>
          <span>© {new Date().getFullYear()} Zentric Inc.</span>
        </div>
      </div>
    </footer>
  );
}
