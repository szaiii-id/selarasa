#!/bin/sh

set -e

php artisan config:clear
php artisan cache:clear

php artisan migrate --force

php artisan db:seed --class=UserSeeder --force

exec docker-php-entrypoint frankenphp run --config /etc/caddy/Caddyfile