#!/bin/sh
# Fails when a secret or a private key is tracked, or when the Next.js service
# would receive one. Real values belong in the server environment.
set -eu

cd "$(dirname "$0")/.."

fail=0
say() {
    echo "$1" >&2
    fail=1
}

if ! tracked_pem=$(git ls-files '*.pem' 'apps/api/config/jwt/*'); then
    say "git ls-files failed"
    tracked_pem=""
fi
if [ -n "$tracked_pem" ]; then
    say "Tracked private key material:"
    printf '%s\n' "$tracked_pem" >&2
fi

if ! tracked_env=$(git ls-files -- '.env' 'apps/web/.env' 'apps/web/.env.*'); then
    say "git ls-files failed"
    tracked_env=""
fi
if [ -n "$tracked_env" ]; then
    say "A real environment file is tracked:"
    printf '%s\n' "$tracked_env" >&2
fi

for key in APP_SECRET JWT_PASSPHRASE DISCORD_CLIENT_SECRET DISCORD_BOT_TOKEN; do
    if grep -Eq "^${key}=.+" apps/api/.env; then
        say "apps/api/.env sets ${key}"
    fi
done

if grep -Eq '^APP_SECRET=.+' apps/api/.env.dev; then
    say "apps/api/.env.dev must not contain APP_SECRET"
fi

if ! grep -qxF "APP_SECRET='\$ecretf0rt3st'" apps/api/.env.test; then
    say "apps/api/.env.test must keep the known test dummy, not a real secret"
fi

set +e
git grep -I -n -e "BEGIN PRIVATE KEY" -e "BEGIN RSA PRIVATE KEY" -- . ':!apps/api/config/reference.php' >/dev/null 2>&1
git_grep_status=$?
set -e
if [ "$git_grep_status" -eq 0 ]; then
    say "A private key is committed"
elif [ "$git_grep_status" -gt 1 ]; then
    say "git grep failed"
fi

web_env=$(awk '
    $0 ~ /^  web:/ { in_web=1; next }
    in_web && $0 ~ /^  [A-Za-z]/ { in_web=0 }
    in_web && $0 ~ /^    environment:/ { in_env=1; next }
    in_web && in_env && $0 ~ /^    [A-Za-z]/ { in_env=0 }
    in_web && in_env { print }
' compose.yaml compose.prod.yaml)

if printf '%s\n' "$web_env" | grep -Eq 'APP_SECRET|JWT_|DISCORD_|DB_PASSWORD|DATABASE_URL|MYSQL_'; then
    say "The Next.js service receives a server secret"
fi

if grep -Eq 'ENV .*(SECRET|TOKEN|PASSWORD|JWT_|DISCORD_|DATABASE_)' docker/web/Dockerfile; then
    say "The web image bakes in a server secret"
fi

if ! grep -q 'APP_SECRET must be set to a unique value' docker/php/docker-entrypoint.sh; then
    say "Production entrypoint must refuse a missing APP_SECRET"
fi

if [ "$fail" -ne 0 ]; then
    exit 1
fi

echo "No tracked secrets."
