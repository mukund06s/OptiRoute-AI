#!/bin/sh
set -e

echo "[Backend] Applying database migrations..."
npx prisma migrate deploy --schema=../prisma/schema.prisma

echo "[Backend] Starting application..."
exec "$@"
