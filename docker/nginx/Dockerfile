# syntax=docker/dockerfile:1
#
# Production-only image. The `api` build context is wired in compose.prod.yaml,
# which makes Compose build the API image first.

FROM nginx:1.27-alpine

COPY docker/nginx/upstream.conf /etc/nginx/conf.d/00-upstream.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# nginx never executes PHP: it only needs the files to exist for try_files, and
# to serve the static assets installed by the bundles.
COPY --from=api /var/www/html/public/ /var/www/html/public/

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
    CMD wget --spider -q http://127.0.0.1/ || exit 1
