#!/bin/sh
set -e

# Only run the bootstrap for PHP processes, so `docker compose run api sh` stays fast.
case "$1" in
	php-fpm | php | bin/console | composer) ;;
	*) exec "$@" ;;
esac

mkdir -p var/cache var/log config/jwt public/uploads/events public/uploads/decrees

# A fresh named volume is root-owned. PHP-FPM writes posters as www-data, and
# nginx (a different user, often a different container) must still be able to
# read them. Bind mounts used in dev, Windows in particular, may reject chown.
if ! chown www-data:www-data public/uploads public/uploads/events public/uploads/decrees 2>/dev/null \
	|| ! chmod 0755 public/uploads public/uploads/events public/uploads/decrees 2>/dev/null; then
	if [ "$APP_ENV" = 'prod' ]; then
		echo '[entrypoint] Could not prepare public/uploads for www-data.' >&2
		exit 1
	fi
fi

# Production refuses the compose placeholders. The real values come from the server environment.
if [ "$APP_ENV" = 'prod' ]; then
	case "${APP_SECRET:-}" in
		''|change_me_in_env)
			echo '[entrypoint] APP_SECRET must be set to a unique value.' >&2
			exit 1
			;;
	esac
	case "${JWT_PASSPHRASE:-}" in
		''|change_me_in_env)
			echo '[entrypoint] JWT_PASSPHRASE must be set to a unique value.' >&2
			exit 1
			;;
	esac
	# Local compose defaults (mairie, root, empty) are refused only in production.
	# The value itself is never written to the log.
	case "${DB_PASSWORD:-}" in
		''|mairie|root|change_me_in_env)
			echo '[entrypoint] DB_PASSWORD must be set to a unique value.' >&2
			exit 1
			;;
	esac
	case "${DATABASE_URL:-}" in
		*://*:mairie@*|*://*:root@*|*://*:change_me_in_env@*|*://*:@*)
			echo '[entrypoint] The database password in DATABASE_URL must be unique.' >&2
			exit 1
			;;
	esac
fi

if [ "$APP_ENV" != 'prod' ] && [ ! -f vendor/autoload_runtime.php ]; then
	echo '[entrypoint] Installing Composer dependencies...'
	# Bind mounts (Windows especially) leave stale assets:install temp dirs that
	# make Composer's assets:install auto-script fail with "Directory not empty".
	rm -rf public/bundles
	composer install --prefer-dist --no-progress --no-interaction
fi

if [ ! -f config/jwt/private.pem ]; then
	echo '[entrypoint] Generating the JWT keypair...'
	php bin/console lexik:jwt:generate-keypair --skip-if-exists --no-interaction
fi

if [ -n "$DATABASE_URL" ]; then
	echo '[entrypoint] Waiting for the database...'
	attempt=0
	until php bin/console dbal:run-sql 'SELECT 1' --quiet >/dev/null 2>&1; do
		attempt=$((attempt + 1))
		if [ "$attempt" -ge 60 ]; then
			echo '[entrypoint] Database is still unreachable, aborting.' >&2
			exit 1
		fi
		sleep 1
	done

	if [ "$AUTO_MIGRATE" = '1' ]; then
		php bin/console doctrine:database:create --if-not-exists --no-interaction
		php bin/console doctrine:migrations:migrate --allow-no-migration --no-interaction
	fi
fi

# php-fpm needs to write the cache and the uploaded files as www-data.
setfacl -R -m u:www-data:rwX -m u:"$(id -u -n)":rwX var config/jwt 2>/dev/null || true
setfacl -dR -m u:www-data:rwX -m u:"$(id -u -n)":rwX var config/jwt 2>/dev/null || true

# Posters are served by nginx as a different user. 0022 keeps new files
# world-readable (0644) and new directories traversable (0755).
umask 0022

exec "$@"
