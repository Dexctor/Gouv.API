#!/usr/bin/env bash
# Setup rapide d'une base Postgres locale pour le dev.
# Usage : scripts/setup-db.sh
set -euo pipefail

DB_NAME="${DB_NAME:-gouv_api}"
DB_USER="${DB_USER:-gouv_user}"
DB_PASSWORD="${DB_PASSWORD:-dev_password}"

if command -v docker >/dev/null 2>&1; then
  echo "→ Lancement d'un conteneur Postgres (gouv-api-pg)..."
  docker rm -f gouv-api-pg >/dev/null 2>&1 || true
  docker run --name gouv-api-pg \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -e POSTGRES_DB="$DB_NAME" \
    -p 5432:5432 \
    -d postgres:15
  echo "✓ Conteneur lancé. DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
else
  echo "Docker indisponible. Configurez manuellement Postgres et adaptez DATABASE_URL."
  exit 1
fi
