#!/usr/bin/env bash
# Ejecuta las pruebas de integración de la BD (RLS + hook) contra un Postgres local.
# Crea una BD desechable, aplica el shim + las migraciones y corre el test SQL.
# Requiere psql en el PATH. No usa Supabase real (ver _harness.sql).
#
# Uso:  bash supabase/tests/run.sh
set -euo pipefail

DB="${VF_TEST_DB:-vf_migrate_test}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIG="$HERE/../migrations"

echo "→ Recreando base de datos de prueba: $DB"
psql -d postgres -v ON_ERROR_STOP=1 -q -c "DROP DATABASE IF EXISTS $DB;" -c "CREATE DATABASE $DB;"

echo "→ Aplicando harness (shim auth + roles)"
psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$HERE/_harness.sql"

echo "→ Aplicando migraciones de esquema (0001–0004, 0006–0010, 0012, 0013; se omite 0005 seed y 0011 storage)"
for f in 0001_init_tenancy 0002_rls_helpers 0003_rls_policies 0004_access_token_hook \
         0006_events 0007_ticket_tiers 0008_events_rls \
         0009_ticketing 0010_ticketing_rls 0012_enterprise_multitenancy 0013_event_flyer; do
  psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$MIG/$f.sql"
done

echo "→ Ejecutando pruebas de aislamiento (foundation)"
psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$HERE/rls_isolation.test.sql"

echo "→ Ejecutando pruebas de aislamiento (event-management)"
psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$HERE/events_rls.test.sql"

echo "→ Ejecutando pruebas de ticketing (RLS + check-in atómico)"
psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$HERE/ticketing_rls.test.sql"

echo "→ Limpiando"
psql -d postgres -q -c "DROP DATABASE IF EXISTS $DB;" >/dev/null
echo "✔ Pruebas de integración OK"
