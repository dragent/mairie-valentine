# syntax=docker/dockerfile:1

ARG PHP_VERSION=8.4
ARG COMPOSER_VERSION=2.8

FROM composer:${COMPOSER_VERSION} AS composer_bin


FROM php:${PHP_VERSION}-fpm-alpine AS base

RUN apk add --no-cache \
        acl \
        fcgi \
        git \
        icu-data-full \
        icu-libs \
        libzip \
        mysql-client \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        icu-dev \
        libzip-dev \
        linux-headers \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        intl \
        opcache \
        pdo_mysql \
        zip \
    && pecl install apcu \
    && docker-php-ext-enable apcu \
    && apk del .build-deps

COPY --from=composer_bin /usr/bin/composer /usr/bin/composer
COPY docker/php/conf.d/app.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/php/php-fpm.d/www.conf /usr/local/etc/php-fpm.d/zz-www.conf
COPY docker/php/docker-entrypoint.sh /usr/local/bin/docker-entrypoint
RUN chmod +x /usr/local/bin/docker-entrypoint

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1

WORKDIR /var/www/html

ENTRYPOINT ["docker-entrypoint"]
CMD ["php-fpm"]

HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=5 \
    CMD SCRIPT_NAME=/ping SCRIPT_FILENAME=/ping REQUEST_METHOD=GET cgi-fcgi -bind -connect 127.0.0.1:9000 || exit 1


# ---------------------------------------------------------------------------
# Development image: sources are bind-mounted, Xdebug available on demand.
# ---------------------------------------------------------------------------
FROM base AS dev

ENV APP_ENV=dev \
    XDEBUG_MODE=off

RUN apk add --no-cache --virtual .xdebug-deps $PHPIZE_DEPS linux-headers \
    && pecl install xdebug \
    && docker-php-ext-enable xdebug \
    && apk del .xdebug-deps \
    && mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"

COPY docker/php/conf.d/dev.ini /usr/local/etc/php/conf.d/zz-dev.ini


# ---------------------------------------------------------------------------
# Production image: dependencies and sources are baked in.
# ---------------------------------------------------------------------------
FROM base AS prod

ENV APP_ENV=prod \
    APP_DEBUG=0

RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY docker/php/conf.d/prod.ini /usr/local/etc/php/conf.d/zz-prod.ini

COPY apps/api/composer.json apps/api/composer.lock apps/api/symfony.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-progress --no-interaction

COPY apps/api/ ./
RUN composer dump-autoload --classmap-authoritative --no-dev \
    && composer run-script --no-dev post-install-cmd \
    && mkdir -p var/cache var/log config/jwt \
    && chown -R www-data:www-data var config/jwt
