#!/bin/sh
# Dump the town hall database.
# Credentials stay in the db container environment and are never stored in this file.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/../../.." && pwd)
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$root/backups"
out="$root/backups/mairie-$stamp.sql"

docker compose --project-directory "$root" exec -T db \
    sh -c 'mysqldump --single-transaction --no-tablespaces -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
    > "$out"

echo "$out"
