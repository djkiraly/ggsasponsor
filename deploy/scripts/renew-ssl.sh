#!/usr/bin/env bash
# renew-ssl.sh — Dry-run Certbot renewal to confirm auto-renewal is healthy.
# Usage: sudo bash deploy/scripts/renew-ssl.sh

set -euo pipefail

echo "==> Dry-run certificate renewal..."
certbot renew --dry-run

echo ""
echo "If no errors appeared above, auto-renewal is configured correctly."
echo "Certificates renew automatically when within 30 days of expiry."

