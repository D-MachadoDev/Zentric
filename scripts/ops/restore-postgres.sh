#!/usr/bin/env sh
# Restaura volcado (-Fc) con pg_restore en transaccion unica (--single-transaction).
set -eu

if [ "$#" -lt 1 ]; then
  echo "Uso: $0 <ruta-al-archivo.dump>" >&2
  exit 1
fi

DUMP_FILE="$1"
if [ ! -f "${DUMP_FILE}" ]; then
  echo "[Zentric Restore] ERROR: No existe el archivo ${DUMP_FILE}" >&2
  exit 1
fi

CONTAINER_NAME="${POSTGRES_CONTAINER:-zentric-postgres-prod}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-ZentricDb}"

echo "[Zentric Restore] Restaurando ${DUMP_FILE} en ${DB_NAME} (${CONTAINER_NAME})..."
docker exec -i "${CONTAINER_NAME}" pg_restore \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --single-transaction < "${DUMP_FILE}"

echo "[Zentric Restore] Restauración completada exitosamente."
