#!/bin/sh
set -e

# On Docker restarts, restart policies ignore depends_on, so nginx can become
# ready while the API entrypoint is still waiting on MySQL / migrations and
# PHP-FPM is not listening yet. Wait for the FastCGI port before handing off
# to the stock nginx entrypoint.
host="${PHP_UPSTREAM_HOST:-api}"
port="${PHP_UPSTREAM_PORT:-9000}"
attempts="${PHP_UPSTREAM_WAIT_ATTEMPTS:-90}"

echo "[nginx] Waiting for ${host}:${port}..."
i=0
while [ "$i" -lt "$attempts" ]; do
	if nc -z "$host" "$port" >/dev/null 2>&1; then
		echo "[nginx] ${host}:${port} is up."
		exec /docker-entrypoint.sh "$@"
	fi
	i=$((i + 1))
	sleep 1
done

echo "[nginx] ${host}:${port} still unreachable after ${attempts}s, starting anyway." >&2
exec /docker-entrypoint.sh "$@"
