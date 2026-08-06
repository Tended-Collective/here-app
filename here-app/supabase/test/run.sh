#!/usr/bin/env bash
#
# Run schema.sql against a throwaway local Postgres and check the access rules
# actually hold.
#
# Why this exists: the rules are the product. A policy that looks right and does
# nothing is indistinguishable from one that works until somebody reads another
# teacher's data. Two such bugs shipped in the first version of the schema and
# both were found here, not by reading it:
#
#   - a block only worked in one direction, because the policy's subquery
#     against `blocks` was itself filtered by that table's own policy, so the
#     blocked person never saw the row that was supposed to hide them;
#   - reporting a post never hid it from the reporter, for the same reason
#     against `reports`.
#
# Usage:  bash supabase/test/run.sh
# Needs:  postgresql-16 client and server binaries. Nothing else, no network,
#         no Supabase project.
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
DATA=$(mktemp -d)
PORT=${PORT:-5433}
HERE=$(cd "$(dirname "$0")" && pwd)

cleanup() { "$PGBIN/pg_ctl" -D "$DATA" stop -s -m immediate >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

# initdb refuses to run as root, so drop to the postgres user when we are.
AS=""
if [ "$(id -u)" = "0" ]; then chown postgres:postgres "$DATA"; AS="su postgres -c"; fi
run() { if [ -n "$AS" ]; then su postgres -c "$1"; else eval "$1"; fi; }

run "$PGBIN/initdb -D $DATA -U postgres --auth=trust" >/dev/null
run "$PGBIN/pg_ctl -D $DATA -o '-p $PORT -k /tmp' -l $DATA/log start" >/dev/null
sleep 2

psql -h /tmp -p "$PORT" -U postgres -qc "create database here_test" >/dev/null

# The shim is just enough Supabase — the roles, auth.uid(), and the auth and
# storage schemas — for schema.sql to run unmodified. It is deliberately not a
# reimplementation of Supabase; it is the minimum that makes the policies real.
psql -h /tmp -p "$PORT" -U postgres -d here_test -q -f "$HERE/00-shim.sql" 2>/dev/null || true
psql -h /tmp -p "$PORT" -U postgres -d here_test -q -v ON_ERROR_STOP=1 -f "$HERE/../schema.sql"
psql -h /tmp -p "$PORT" -U postgres -d here_test -q -v ON_ERROR_STOP=1 -f "$HERE/01-seed.sql"

echo
psql -h /tmp -p "$PORT" -U postgres -d here_test -f "$HERE/02-rls.sql" 2>&1 \
  | grep -vE "^(BEGIN|ROLLBACK|SAVEPOINT|SET|UPDATE|DELETE|INSERT|Output format)|^$|^psql:.*(violates row-level|transaction is aborted)"
echo

if psql -h /tmp -p "$PORT" -U postgres -d here_test -f "$HERE/02-rls.sql" 2>&1 | grep -q FAIL; then
  echo "FAILURES ABOVE"
  exit 1
fi
echo "All access-rule checks passed."
