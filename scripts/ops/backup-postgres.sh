#!/usr/bin/env sh
# ==============================================================================
# Zentric Marketplace — Respaldo Lógico Comprimido de PostgreSQL 16.15-alpine (W6-S03)
# ==============================================================================
# Genera un volcado en formato custom (-Fc, comprimido y verificable con pg_restore)
# dentro de ./backups/ o del directorio indicado en BACKUP_DIR.
# Uso:
#   ./scripts/ops/backup-postgres.sh
# ==============================================================================
set -eu

CONTAINER_NAME="${POSTGRES_CONTAINER:-zentric-postgres-prod}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-ZentricDb}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="${BACKUP_DIR}/zentric_${DB_NAME}_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "[Zentric Backup] Iniciando respaldo de ${DB_NAME} desde contenedor ${CONTAINER_NAME}..."
docker exec -i "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -Fc --no-owner --no-acl > "${BACKUP_FILE}"

if [ ! -s "${BACKUP_FILE}" ]; then
  echo "[Zentric Backup] ERROR: El archivo de respaldo ${BACKUP_FILE} está vacío." >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

echo "[Zentric Backup] Respaldo completado exitosamente: ${BACKUP_FILE}"
