#!/bin/sh
# Dump the town hall database.
# The password is expanded only inside the database container, into a mode-0600
# client defaults file. A trap removes that file when mysqldump exits, including
# on failure. It is never placed in a process argument.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/../../.." && pwd)
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$root/backups"
out="$root/backups/mairie-$stamp.sql"

# Single quotes: the host shell must not expand MYSQL_PASSWORD into argv.
docker compose --project-directory "$root" exec -T db sh -c 'umask 077
defaults=$(mktemp)
trap "rm -f \"\$defaults\"" EXIT INT TERM
cat > "$defaults" <<EOF
[client]
user=$MYSQL_USER
password=$MYSQL_PASSWORD
EOF
mysqldump --defaults-extra-file="$defaults" --single-transaction --no-tablespaces "$MYSQL_DATABASE"' > "$out"

echo "$out"
