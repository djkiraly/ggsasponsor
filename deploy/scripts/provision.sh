#!/usr/bin/env bash
# provision.sh — One-time VPS setup (Ubuntu 22.04).
# Usage: sudo bash deploy/scripts/provision.sh <app-user> <domain>

set -euo pipefail

APP_USER="${1:?Usage: $0 <app-user> <domain>}"
DOMAIN="${2:?Usage: $0 <app-user> <domain>}"
APP_DIR="/var/www/ggsa"
NODE_VERSION="20"

echo "==> Updating system packages..."
apt-get update -qq && apt-get upgrade -y

echo "==> Installing system dependencies..."
apt-get install -y curl git ufw fail2ban nginx build-essential

echo "==> Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'   # Opens ports 80 and 443; port 3000 stays closed
ufw --force enable
ufw status

echo "==> Installing Node.js ${NODE_VERSION}.x..."
curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
apt-get install -y nodejs

echo "==> Installing PM2 globally..."
npm install -g pm2

echo "==> Creating app user '${APP_USER}'..."
id -u "$APP_USER" &>/dev/null || adduser --disabled-password --gecos "" "$APP_USER"

echo "==> Creating app and log directories..."
mkdir -p "$APP_DIR" /var/log/pm2
chown -R "${APP_USER}:${APP_USER}" "$APP_DIR" /var/log/pm2

echo "==> Installing nginx site config..."
cp deploy/nginx/ggsa.conf /etc/nginx/sites-available/ggsa
ln -sf /etc/nginx/sites-available/ggsa /etc/nginx/sites-enabled/ggsa
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx

echo "==> Configuring PM2 startup on reboot..."
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "/home/${APP_USER}" | tail -1 | bash

echo ""
echo "==> Provisioning complete. Next steps:"
echo "    1. As ${APP_USER}: git clone <repo> ${APP_DIR}"
echo "    2. Copy and fill in: cp ${APP_DIR}/.env.example ${APP_DIR}/.env"
echo "    3. As root: sudo bash deploy/scripts/setup-ssl.sh ${DOMAIN} <admin-email>"
echo "    4. As ${APP_USER}: cd ${APP_DIR} && npm ci && npm run db:push && npm run db:seed && npm run build"
echo "    5. As ${APP_USER}: pm2 start deploy/ecosystem.config.js --env production && pm2 save"

