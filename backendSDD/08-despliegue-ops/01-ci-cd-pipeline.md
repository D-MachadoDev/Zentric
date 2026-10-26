# Backend — CI/CD Pipeline — Zentric

**Fuente:** `../frontendSDD/PROMPT-MAESTRO-AGENTES-CONCURRENTES.md` §4 (Quality Gates)
**Estado:** Especificación vinculante para `Zentric.Api` + `Zentric.Tests` + GitHub Actions

---

## 1. 13 Quality Gates Obligatorios (por PR)

| # | Gate | Herramienta | Comando | Criterio de Paso | Bloqueante |
|---|------|-------------|---------|------------------|------------|
| 1 | **Build** | `dotnet build` | `dotnet build -c Release --no-restore` | 0 errors, 0 warnings (strict) | ✅ Sí |
| 2 | **Lint/Format** | `dotnet format` | `dotnet format --verify-no-changes` | 0 issues | ✅ Sí |
| 3 | **Typecheck** | `dotnet build` | (incluido en build) | 0 errors | ✅ Sí |
| 4 | **Unit Tests** | `dotnet test` | `dotnet test --filter "Category=Unit"` | Coverage: Domain 90%, App 85%, Infra 70% | ✅ Sí |
| 5 | **Integration Tests** | `dotnet test` (Testcontainers) | `dotnet test --filter "Category=Integration"` | 100% CU críticos cubiertos | ✅ Sí |
| 6 | **Contract Tests** | `pact-verifier` | `pact-verifier --provider-base-url=http://localhost:5000` | Provider + Consumer passing | ✅ Sí |
| 7 | **E2E Tests** | `playwright test` (API) | `playwright test --project=api` | Flujos críticos por rol passing | ✅ Sí |
| 8 | **Accessibility** | `axe-core` (Playwright) | `playwright test --project=a11y` | 0 violations serious/critical | ✅ Sí |
| 9 | **Visual Regression** | Playwright pixel diff | `playwright test --project=visual` | Diff ≤ 0.1% (layouts críticos) | ✅ Sí |
---

## 2. Pipeline GitHub Actions (`.github/workflows/ci.yml`)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  DOTNET_VERSION: '10.0.x'
  NODE_VERSION: '20.x'

jobs:
  quality-gates:
    name: Quality Gates (1-13)
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      
      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with: { dotnet-version: ${{ env.DOTNET_VERSION }} }
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with: { node-version: ${{ env.NODE_VERSION }} }
      
      - name: Restore dependencies
        run: dotnet restore Zentric.sln
      
      - name: Build (Gate 1)
        run: dotnet build Zentric.sln -c Release --no-restore
      
      - name: Lint/Format (Gate 2)
        run: dotnet format --verify-no-changes
      
      - name: Unit Tests (Gate 4)
        run: dotnet test Zentric.Tests.Domain Zentric.Tests.Application --filter "Category=Unit" --collect:"XPlat Code Coverage"
      
      - name: Coverage Check
        run: |
          reportgenerator -reports:"**/coverage.cobertura.xml" -targetdir:coveragereport
          # Script personalizado para validar umbrales
      
      - name: Integration Tests (Gate 5)
        run: |
          docker run -d --name postgres-test -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:16
          dotnet test Zentric.Tests.Integration --filter "Category=Integration"
      
      - name: Contract Tests (Gate 6)
        run: |
          dotnet tool restore
          dotnet pact-verifier --provider-base-url=http://localhost:5000 --pact-urls=./pacts
      
      - name: E2E API Tests (Gate 7)
        run: |
          dotnet run --project Zentric.Api --urls=http://localhost:5000 &
          sleep 10
          npx playwright test --project=api
      
      - name: Accessibility Tests (Gate 8)
        run: npx playwright test --project=a11y
      
      - name: Visual Regression (Gate 9)
        run: npx playwright test --project=visual
      
      - name: Lighthouse CI (Gate 10)
        run: |
          npm ci
          npx lhci autorun
      
      - name: Bundle Analysis (Gate 11)
        run: |
          dotnet tool restore
          dotnet-outdated
      
      - name: Security Scans (Gate 12)
        run: |
          gitleaks detect --source=. --verbose
          docker run --rm -v $(pwd):/src owasp/dependency-check:latest --scan /src --format JSON
      
      - name: Documentation Check (Gate 13)
        run: ./scripts/check-docs.sh

  deploy-staging:
    name: Deploy Staging
    needs: quality-gates
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Staging
        run: |
          # Docker build + push to registry
          # kubectl apply -f k8s/staging/
          # Smoke tests: health, auth, 3 endpoints críticos
        env:
          KUBECONFIG: ${{ secrets.STAGING_KUBECONFIG }}

  deploy-production:
    name: Deploy Production
    needs: quality-gates
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
---

## 3. Feature Flags (LaunchDarkly / Unleash)

| Flag | Descripción | Default | Rollout |
|------|-------------|---------|---------|
| `new-checkout-v2` | Nuevo flujo checkout multi-paso | `false` | 10% → 50% → 100% |
| `marketplace-warehouse-visibility` | Ver bodegas Marketplace en AddStock | `true` | 100% (ya en prod) |
| `digital-returns-enabled` | Permitir devoluciones digitales | `false` | 0% (prohibido por dominio) |
| `payout-split-v2` | Nuevo algoritmo split comisiones | `false` | Canary 5% |

**Regla:** Toda feature nueva detrás de flag. Rollback instantáneo = toggle off.

---

## 4. Versionado y Release

- **SemVer**: `MAJOR.MINOR.PATCH` (ej. `2.3.1`)
- **Main branch** = Production ready. `develop` = Staging.
- **Tag**: `git tag -a v2.3.1 -m "Release 2.3.1"`
- **Changelog**: `CHANGELOG.md` (Keep a Changelog format)
- **Release Notes**: Generado auto desde PRs merged + conventional commits.
        run: |
          # Blue-green deployment
          # Feature flags off para nuevas features
          # Rollback automático si smoke tests fallan
        env:
          KUBECONFIG: ${{ secrets.PROD_KUBECONFIG }}
```
| 10 | **Lighthouse CI** | `lighthouse-ci` | `lhci autorun` | Perf≥90, A11y=100, BP≥90, SEO≥90 | ✅ Sí |
| 11 | **Bundle Analysis** | `dotnet-outdated` + size | `dotnet-outdated` + `du -sh publish/` | No regresión > 5% vs baseline | ✅ Sí |
| 12 | **Security** | `gitleaks` + `dependency-check` | `gitleaks detect` + `dependency-check.sh` | 0 secrets, 0 CVEs critical/high | ✅ Sí |
| 13 | **Documentation** | Custom check | `./scripts/check-docs.sh` | README + ADR + CHANGELOG actualizados | ✅ Sí |
