# Backend — Rollback y Contingencia — Zentric

**Fuente:** `../frontendSDD/PROMPT-MAESTRO-AGENTES-CONCURRENTES.md` sección 8
**Estado:** Procedimientos obligatorios para `Zentric.Api` + `Zentric.Infrastructure` + Kubernetes

---

## 1. Protección de Ramas (Branch Protection)

```yaml
# .github/branch-protection/main.yml
branches:
  - name: main
    protection:
      required_pull_request_reviews:
        required_approving_review_count: 2
        dismiss_stale_reviews: true
        require_code_owner_reviews: true
      required_status_checks:
        strict: true
        contexts:
          - "Quality Gates (1-13)"
          - "Build"
          - "Unit Tests"
          - "Integration Tests"
          - "Contract Tests"
          - "E2E Tests"
          - "Security Scans"
      enforce_admins: true
      required_linear_history: true
      allow_force_pushes: false
      allow_deletions: false
```

---

## 2. Feature Flags (Rollback Instantáneo)

| Flag | Comando Rollback | Tiempo |
|------|------------------|--------|
| `new-checkout-v2` | `ld flag update new-checkout-v2 --off` | < 30 seg |
| `payout-split-v2` | `ld flag update payout-split-v2 --off` | < 30 seg |
| Cualquier flag | Toggle off en LaunchDarkly/Unleash UI | < 1 min |

**Regla:** Rollback de feature = toggle off. No requiere redeploy.

---

## 3. Base de Datos — Migraciones Reversibles

### 3.1 Requisitos de Migración
- Cada migración EF Core **DEBE** tener `Down()` implementado y probado.
- `dotnet ef migrations add` → genera `Up()` + `Down()`.
- Test de rollback: `dotnet ef database update <PreviousMigration>` en CI.

### 3.2 Backup Point-in-Time Recovery (PITR)
- **PostgreSQL**: `pg_basebackup` + WAL archiving continuo.
- **RPO**: ≤ 5 min (WAL streaming a S3/MinIO).
- **RTO**: ≤ 15 min (restore + replay WAL).
- **Retención**: 30 días backups completos + 90 días WAL.

---

## 4. Despliegue Staging Automático en PR

### 4.1 Smoke Tests Pre-Merge
```bash
# Ejecutados automáticamente en PR antes de merge
curl -f https://staging.zentric.com/health      # Liveness
curl -f https://staging.zentric.com/ready     # Readiness
curl -f -H "Authorization: Bearer $TOKEN" \
  https://staging.zentric.com/api/v1/auth/me          # Auth
curl -f https://staging.zentric.com/api/v1/products   # Public endpoint
```

### 4.2 Criterios de Aprobación Staging
- ✅ 3 endpoints críticos responden 200 en < 2s
- ✅ Health checks: `live` + `ready` = healthy
- ✅ Auth flow: login → me → logout OK
- ✅ 0 errors en logs últimos 5 min

---

## 5. Rollback Producción (Blue-Green)

### 5.1 Arquitectura Blue-Green
```
                    ┌─────────────────┐
                    │   Load Balancer │ (AWS ALB / Cloudflare LB)
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
        ┌───────────┐                 ┌───────────┐
        │  Blue v2.3.1  │                 │  Green v2.3.0  │
        │  (Active)     │                 │  (Standby)     │
        └───────────┘                 └───────────┘
```

### 5.2 Procedimiento Rollback Producción
```bash
# 1. Detectar incidente (alertas: error rate > 1%, latency p99 > 2s, health check fail)
# 2. Confirmar con Owner (Slack/Teams) → decisión rollback
# 3. Switch traffic a versión anterior (Green)
aws elbv2 modify-listener --listener-arn $LISTENER_ARN \
  --default-actions Type=forward,TargetGroupArn=$GREEN_TG_ARN

# 4. Verificar salud Green
curl -f https://zentric.com/ready
# Smoke tests automatizados

# 5. Notificar a equipo + Owner
# 6. Investigar causa raíz en Blue (logs, métricas, traces)
# 7. Fix + deploy nuevo Blue → switch back cuando estable
```

### 5.3 Tiempo Objetivo
| Paso | Tiempo Máximo |
|------|---------------|
| Detección + Decisión | 5 min |
| Switch Traffic | 30 seg |
| Smoke Tests | 2 min |
| **Total RTO** | **≤ 8 min** |

---

## 6. DNS Rollback (Si Aplica)

| Proveedor | Comando | Tiempo |
|-----------|---------|--------|
| Cloudflare | `terraform apply -target=cloudflare_record.www` (TTL 60s) | < 2 min |
| Route53 | `aws route53 change-resource-record-sets --change-batch file://rollback.json` | < 1 min |

**TTL recomendado:** 60 segundos para registros críticos (`api.zentric.com`, `app.zentric.com`).

---

## 7. Comunicación de Incidencias

| Canal | Quién | Plantilla |
|-------|-------|-----------|
| **Slack #incidents** | On-call + Tech Lead | `INCIDENT-[SEV] - [Servicio] - [Impacto] - [Estado]` |
| **Email Owner** | Tech Lead | Resumen ejecutivo + timeline + acción correctiva |
| **Status Page** | Comunicaciones | Actualización cada 15 min durante incidente |

### Plantilla Incidente
```
INCIDENT-SEV2 - Checkout Service - 15% pagos fallidos - INVESTIGATING

Impacto: Usuarios no pueden completar compra (15% error rate)
Inicio: 2026-10-25 14:32 UTC
Detección: Alert P99 latency > 2s + Error rate > 1%
Acciones: 
  - 14:35 Rollback feature flag new-checkout-v2 (OK)
  - 14:36 Smoke tests staging (OK)
  - 14:37 Switch Blue-Green a v2.3.0 (OK)
  - 14:40 Confirmado recovery (error rate < 0.1%)
Próximos pasos: Root cause analysis en PR #1234
```
### 3.3 Procedimiento Rollback DB
```bash
# 1. Identificar migración problemática
dotnet ef migrations list --project Zentric.Infrastructure

# 2. Rollback a migración anterior (ej. 20261025120000_AddFeatureX)
dotnet ef database update 20261025110000_InitialSchema \
  --project Zentric.Infrastructure \
  --startup-project Zentric.Api

# 3. Verificar integridad
dotnet ef database update --project Zentric.Infrastructure --startup-project Zentric.Api --dry-run

# 4. Si falla Down() → Restore desde backup PITR
pg_restore -d zentric_prod -Fc /backups/zentric_20261025_140000.dump
```
