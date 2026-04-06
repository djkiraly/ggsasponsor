#!/usr/bin/env bash
# deploy.sh — Pull latest code, rebuild, reload PM2 with zero downtime.
# Run as the app user from the server.
# Usage: bash deploy/scripts/deploy.sh

set -euo pipefail

APP_DIR="/var/www/ggsa"
LOG_FILE="/var/log/ggsa-deploy.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "Starting deployment..."
cd "$APP_DIR"

log "Pulling latest code..."
git pull origin main

log "Installing dependencies..."
npm ci

log "Running database migrations..."
npm run db:push

log "Building Next.js..."
npm run build

log "Reloading PM2 (zero-downtime cluster reload)..."
pm2 reload deploy/ecosystem.config.js --env production

log "Deployment complete."
pm2 status

