#!/usr/bin/env bash
# Reset database lokal untuk uji E2E (HANYA untuk lingkungan pengembangan).
set -euo pipefail
set -a; . ./.env; set +a
psql -h /tmp -U postgres -q -c "drop database if exists riska with (force);" -c "create database riska;"
npx drizzle-kit migrate >/dev/null
npm run -s db:seed
