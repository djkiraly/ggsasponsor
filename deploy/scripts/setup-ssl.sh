#!/usr/bin/env bash
# setup-ssl.sh — Provision a Let's Encrypt certificate via Certbot.
# Prerequisites: nginx installed, domain A record pointing to this server.
# Usage: sudo bash deploy/scripts/setup-ssl.sh yourdomain.com admin@yourdomain.com

set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> <email>}"
EMAIL="${2:?Usage: $0 <domain> <email>}"

echo "==> Installing Certbot and the nginx plugin..."
apt-get update -qq
apt-get install -y certbot python3-certbot-nginx

echo "==> Creating ACME challenge webroot..."
mkdir -p /var/www/certbot

echo "==> Obtaining certificate for ${DOMAIN} and www.${DOMAIN}..."
certbot certonly \
  --nginx \
  --non-interactive \
  --agree-tos \
  --email  "${EMAIL}" \
  --domains "${DOMAIN},www.${DOMAIN}"

echo "==> Patching nginx config with real domain name..."
sed -i "s/yourdomain.com/${DOMAIN}/g" /etc/nginx/sites-available/ggsa

echo "==> Testing and reloading nginx..."
nginx -t
systemctl reload nginx

echo "==> Enabling Certbot auto-renewal timer..."
systemctl enable --now certbot.timer
systemctl status certbot.timer --no-pager

echo ""
echo "Certificate provisioned: /etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
echo "Auto-renewal:            certbot.timer (runs twice daily)"

