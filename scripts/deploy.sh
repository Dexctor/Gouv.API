#!/usr/bin/env bash
set -euo pipefail

echo "→ Pulling latest main..."
git pull origin main

echo "→ Installing deps..."
pnpm install --frozen-lockfile

echo "→ Generating Prisma client..."
pnpm prisma generate

echo "→ Running migrations..."
pnpm prisma migrate deploy

echo "→ Building..."
pnpm build

echo "→ Restarting PM2..."
pm2 restart gouv-api || pm2 start ecosystem.config.js
pm2 save

echo "✓ Deployed"
