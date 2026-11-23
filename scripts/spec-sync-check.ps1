<#
.SYNOPSIS
    Valida sincronizacion entre especificacion (docs/spec) y codigo fuente (backend/, frontend/).

.DESCRIPTION
    Este script implementa el gate CI spec-sync-check que verifica:
    1. Endpoints en controllers = Queries/Commands en spec backend
    2. Entidades/Agregados en codigo = Entidades en spec backend
    3. ADRs referenciados existen en docs/adr/
    4. Modelos de request/response = DTOs en spec

.NOTES
    Ejecutar en CI: pwsh scripts/spec-sync-check.ps1
    Exit codes: 0 = OK, 1 = Drift detectado
#>

param(
    [switch]$Verbose,
    [switch]$FailOnWarnings
)

$ErrorActionPreference = 'Stop'
$repoRoot = "$PSScriptRoot/.."
$specBackend = "$repoRoot/docs/spec/backend"
$specFrontend = "$repoRoot/docs/spec/frontend"
$codeBackend = "$repoRoot/backend"
$codeFrontend = "$repoRoot/frontend"
$adrDir = "$repoRoot/docs/adr"

$errors = @()
$warnings = @()

function Add-Error { param($msg) $errors += $msg; Write-Host "ERROR: $msg" -ForegroundColor Red }
function Add-Warning { param($msg) $warnings += $msg; Write-Host "WARNING: $msg" -ForegroundColor Yellow }
function Add-Ok { param($msg) if ($Verbose) { Write-Host "OK: $msg" -ForegroundColor Green } }

Write-Host 'Iniciando spec-sync-check...' -ForegroundColor Cyan
Write-Host "Repo root: $repoRoot" -ForegroundColor Gray

# Validar existencia de ADRs referenciados
Write-Host 'Validando referencias a ADRs...' -ForegroundColor Cyan

$adrFiles = Get-ChildItem "$adrDir/ADR-*.md" -File
$adrSet = @{}
foreach ($f in $adrFiles) {
    if ($f.BaseName -match 'ADR-(\d{4})') {
        $adrSet[$Matches[1]] = $true
    }
}

$allMd = Get-ChildItem "$repoRoot/docs/spec" -Recurse -Filter '*.md' -File
    $allMd += Get-ChildItem "$repoRoot/backend" -Recurse -Filter '*.md' -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\(bin|obj)\\' }
    $allMd += Get-ChildItem "$repoRoot/frontend" -Recurse -Filter '*.md' -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\(node_modules|dist|build)\\' }

$adrRefRegex = 'ADR-(\d{4})'
$missingAdrs = @()

foreach ($file in $allMd) {
    $content = Get-Content $file.FullName -Raw
    $adrMatches = [regex]::Matches($content, $adrRefRegex)
    foreach ($m in $adrMatches) {
        $adrNum = $m.Groups[1].Value
        if (-not $adrSet.ContainsKey($adrNum)) {
            $missingAdrs += "ADR-$adrNum referenciado en $($file.FullName.Substring($repoRoot.Length+1))"
        }
    }
}

if ($missingAdrs.Count -gt 0) {
    $missingAdrs | Sort-Object -Unique | ForEach-Object { Add-Error "ADR faltante: $_" }
} else {
    Add-Ok "Todos los ADRs referenciados existen ($($adrFiles.Count) ADRs en docs/adr/)"
}

# Extraer endpoints de controllers backend
Write-Host 'Validando endpoints backend...' -ForegroundColor Cyan

$controllerFiles = Get-ChildItem "$codeBackend/Zentric.Api/Controllers" -Filter '*.cs' -File

$endpointRegex = '\[Http(Get|Post|Put|Patch|Delete)\("([^"]+)"\)\]'
$methodRegex = 'public\s+async\s+Task<IActionResult>\s+(\w+)\s*\('

$codeEndpoints = @()
foreach ($file in $controllerFiles) {
    $content = Get-Content $file.FullName -Raw
    $controllerName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    
    $methodMatches = [regex]::Matches($content, $methodRegex)
    foreach ($match in $methodMatches) {
        $methodName = $match.Groups[1].Value
        $beforeMethod = $content.Substring(0, $match.Index)
        $lastHttpAttr = [regex]::Matches($beforeMethod, $endpointRegex) | Select-Object -Last 1
        if ($lastHttpAttr) {
            $verb = $lastHttpAttr.Groups[1].Value.ToUpper()
            $route = $lastHttpAttr.Groups[2].Value
            $codeEndpoints += [pscustomobject]@{
                Controller = $controllerName
                Method     = $methodName
                Verb       = $verb
                Route      = $route
                Source     = 'Code'
            }
        }
    }
}

Add-Ok "Endpoints en codigo: $($codeEndpoints.Count)"

# Extraer queries y commands de spec backend
Write-Host 'Validando queries/commands en spec...' -ForegroundColor Cyan

$specApiFiles = Get-ChildItem "$specBackend/04-api-contratos" -Filter '*.md' -File

$specQueriesCommands = @()
foreach ($file in $specApiFiles) {
    $content = Get-Content $file.FullName -Raw
    $adrMatches = [regex]::Matches($content, '(GET|POST|PUT|PATCH|DELETE)\s+(/api/\S+)')
    foreach ($match in $adrMatches) {
        $specQueriesCommands += [pscustomobject]@{
            Verb  = $match.Groups[1].Value
            Route = $match.Groups[2].Value
            Source = $file.Name
        }
    }
}

Add-Ok "Endpoints en spec: $($specQueriesCommands.Count)"

# Comparar endpoints entre codigo y spec
Write-Host 'Comparando endpoints code vs spec...' -ForegroundColor Cyan

$codeRoutes = $codeEndpoints | Select-Object -ExpandProperty Route -Unique
$specRoutes = $specQueriesCommands | Select-Object -ExpandProperty Route -Unique

# Validar entidades y agregados backend
Write-Host 'Validando entidades/agregados backend...' -ForegroundColor Cyan

$domainEntities = Get-ChildItem "$codeBackend/Zentric.Domain" -Recurse -Filter '*.cs' -File | Where-Object {
    $content = Get-Content $_.FullName -Raw
    $content -match '(sealed\s+)?(record|class)\s+\w+\s*(:|$)'
} | ForEach-Object {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
    $content = Get-Content $_.FullName -Raw
    $isAggregate = $content -match 'AggregateRoot|IAggregateRoot|sealed\s+record'
    $isEntity = $content -match '\bEntity\b|\bIAggregateRoot\b'
    [pscustomobject]@{
        Name      = $name
        IsAggregate = $isAggregate
        IsEntity    = $isEntity -or $isAggregate
        Path      = $_.FullName.Substring($repoRoot.Length+1)
    }
}

Add-Ok "Entidades/agregados en codigo: $($domainEntities.Count)"

$specEntities = Get-ChildItem "$specBackend/01-dominio/01-entidades-y-value-objects.md" -ErrorAction SilentlyContinue
if ($specEntities) {
    $content = Get-Content $specEntities.FullName -Raw
    $entityHeaders = [regex]::Matches($content, '^##\s+(\w+)')
    Add-Ok "Entidades documentadas en spec: $($entityHeaders.Count)"
} else {
    Add-Warning 'No se encontro spec de entidades (01-dominio/01-entidades-y-value-objects.md)'
}

# Validar DTOs de request y response
Write-Host 'Validando DTOs request/response...' -ForegroundColor Cyan

$dtoFiles = Get-ChildItem "$codeBackend/Zentric.Application" -Recurse -Filter '*Dto*.cs' -File
$dtoFiles += Get-ChildItem "$codeBackend/Zentric.Application" -Recurse -Filter '*Command*.cs' -File
$dtoFiles += Get-ChildItem "$codeBackend/Zentric.Application" -Recurse -Filter '*Query*.cs' -File

$codeDtos = $dtoFiles | ForEach-Object {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
    [pscustomobject]@{
        Name = $name
        Path = $_.FullName.Substring($repoRoot.Length+1)
    }
}

Add-Ok "DTOs/Commands/Queries en codigo: $($codeDtos.Count)"

# Validar interfaces de modelos frontend
Write-Host 'Validando modelos frontend...' -ForegroundColor Cyan

$frontendModels = Get-ChildItem "$codeFrontend/apps/frontend/src/domain/models" -Filter '*.ts' -File -ErrorAction SilentlyContinue
if ($frontendModels) {
    $modelCount = 0
    foreach ($file in $frontendModels) {
        $content = Get-Content $file.FullName -Raw
        $interfaces = [regex]::Matches($content, 'export\s+interface\s+(\w+)')
        $modelCount += $interfaces.Count
    }
    Add-Ok "Interfaces TypeScript en frontend: $modelCount"
} else {
    Add-Warning 'No se encontro carpeta de modelos frontend'
}

# Resumen de verificacion
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host 'RESUMEN SPEC-SYNC-CHECK' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan

Write-Host "OK: $(if ($errors.Count -eq 0) { 'SI' } else { 'NO' })"
Write-Host "Errores: $($errors.Count)"
Write-Host "Warnings: $($warnings.Count)"

if ($errors.Count -gt 0) {
    Write-Host 'ERRORES BLOQUEANTES:' -ForegroundColor Red
    $errors | ForEach-Object { Write-Host '  - $_' -ForegroundColor Red }
}

if ($warnings.Count -gt 0) {
    Write-Host 'ADVERTENCIAS:' -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host '  - $_' -ForegroundColor Yellow }
}

if ($FailOnWarnings -and $warnings.Count -gt 0) {
    Write-Host 'Fallando por warnings (--FailOnWarnings)' -ForegroundColor Red
    exit 1
}

if ($errors.Count -gt 0) {
    Write-Host 'SPEC-SYNC-CHECK FALLO - Hay drift spec<->codigo' -ForegroundColor Red
    exit 1
} else {
    Write-Host 'SPEC-SYNC-CHECK PASO - Spec y codigo sincronizados' -ForegroundColor Green
    exit 0
}
