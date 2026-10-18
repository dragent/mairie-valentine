#!/bin/sh
# Restore a dump produced by backup-database.sh into the running database.
# Usage: sh apps/api/bin/restore-database.sh backups/mairie-YYYYMMDDTHHMMSSZ.sql
set -eu

if [ $# -ne 1 ] || [ ! -f "$1" ]; then
    echo "Usage: restore-database.sh <dump.sql>" >&2
    exit 1
fi

root=$(CDPATH= cd -- "$(dirname "$0")/../../.." && pwd)
dump=$(CDPATH= cd -- "$(dirname "$1")" && pwd)/$(basename "$1")

docker compose --project-directory "$root" exec -T db \
    sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
    < "$dump"
