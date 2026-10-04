#!/bin/sh
set -e

# Only run the bootstrap for PHP processes, so `docker compose run api sh` stays fast.
case "$1" in
	php-fpm | php | bin/console | composer) ;;
	*) exec "$@" ;;
esac

mkdir -p var/cache var/log config/jwt

if [ "$APP_ENV" != 'prod' ] && [ ! -f vendor/autoload_runtime.php ]; then
	echo '[entrypoint] Installing Composer dependencies...'
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

exec "$@"
