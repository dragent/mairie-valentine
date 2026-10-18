#!/bin/sh
# Restore a dump produced by backup-database.sh into the running database.
# Usage: sh apps/api/bin/restore-database.sh backups/mairie-YYYYMMDDTHHMMSSZ.sql
# The password follows the same defaults-file path as the backup, and the trap
# removes the file even when mysql rejects the dump.
set -eu

if [ $# -ne 1 ] || [ ! -f "$1" ]; then
    echo "Usage: restore-database.sh <dump.sql>" >&2
    exit 1
fi

root=$(CDPATH= cd -- "$(dirname "$0")/../../.." && pwd)
dump=$(CDPATH= cd -- "$(dirname "$1")" && pwd)/$(basename "$1")

# Single quotes: the host shell must not expand MYSQL_PASSWORD into argv.
docker compose --project-directory "$root" exec -T db sh -c 'umask 077
defaults=$(mktemp)
trap "rm -f \"\$defaults\"" EXIT INT TERM
cat > "$defaults" <<EOF
[client]
user=$MYSQL_USER
password=$MYSQL_PASSWORD
EOF
mysql --defaults-extra-file="$defaults" "$MYSQL_DATABASE"' < "$dump"
