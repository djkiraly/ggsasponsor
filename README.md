# Gering Girls Softball Association (GGSA) Sponsorship Portal

## Project Description

This application lets businesses and individuals submit sponsorship applications, upload optional logo/banner designs to Google Cloud Storage (GCS) via signed URLs, pay with Stripe (cards + ACH), and receive Gmail receipt emails. All submissions and admin decisions are stored in Neon.tech (Postgres) using Drizzle ORM. An admin dashboard is protected by NextAuth (credentials provider).

In production, nginx reverse-proxies public traffic to Next.js running on `127.0.0.1:3000` with TLS handled by Certbot.

## Prerequisites

- Node.js 20+ (installed by `deploy/scripts/provision.sh`)
- A Linux VPS running Ubuntu 22.04+ with a public IPv4 address
- A domain with an A record (and optionally `www` CNAME) pointing to the VPS IP
- Accounts: Neon.tech, Stripe, Google Cloud (GCS + Gmail API)

## Local Development Setup

```bash
git clone <repo>
cd ggsa
npm install
cp .env.example .env   # fill in all values; set NEXTAUTH_URL=http://localhost:3000
npm run db:push
npm run db:seed
npm run dev
```

Note: nginx and Certbot are production-only. In development, access the app at `http://localhost:3000`.

## Production Deployment — Step by Step

### Step 1 — Provision the server (run as root)

```bash
git clone <repo> /tmp/ggsa-setup
sudo bash /tmp/ggsa-setup/deploy/scripts/provision.sh appuser yourdomain.com
```

### Step 2 — Clone the repo and configure environment

```bash
# As appuser:
git clone <repo> /var/www/ggsa
cd /var/www/ggsa
cp .env.example .env
nano .env
# Set NEXTAUTH_URL=https://yourdomain.com, HOSTNAME=127.0.0.1, and all other values
```

### Step 3 — Provision SSL certificate (run as root, DNS must be live)

```bash
sudo bash /var/www/ggsa/deploy/scripts/setup-ssl.sh yourdomain.com admin@yourdomain.com
```

### Step 4 — Install, migrate, and start

```bash
# As appuser:
cd /var/www/ggsa
npm ci
npm run db:push
npm run db:seed
npm run build
pm2 start deploy/ecosystem.config.js --env production
pm2 save
```

### Step 5 — Verify

```bash
curl -s https://yourdomain.com/api/healthz       # should return {"status":"ok"}
sudo nginx -t && sudo systemctl status nginx
pm2 logs ggsa --lines 50
sudo certbot renew --dry-run
```

## Subsequent deployments

```bash
# As appuser on the server:
bash /var/www/ggsa/deploy/scripts/deploy.sh
```

## SSL auto-renewal

- Certbot installs a systemd timer that attempts renewal twice daily
- Certificates renew automatically when within 30 days of expiry
- Check status: `sudo systemctl status certbot.timer`
- Test manually: `sudo bash deploy/scripts/renew-ssl.sh`

## Stripe webhook configuration

- Local dev: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
- Production: Stripe Dashboard → Developers → Webhooks → Add endpoint
  → `https://yourdomain.com/api/stripe-webhook`
- Enable events:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
- Copy the signing secret to `STRIPE_WEBHOOK_SECRET` in `.env`

Webhook implementation detail:
- The webhook route reads the raw request body bytes for signature verification.
- nginx is configured with `proxy_request_buffering off` for `/api/stripe-webhook` to ensure the body is not modified in transit.

## GCS bucket setup

1. Create a bucket, set CORS to allow PUT from `https://yourdomain.com`
2. Create a service account with "Storage Object Creator" role; download JSON key
3. Extract `client_email` and `private_key` into `GCS_CLIENT_EMAIL` / `GCS_PRIVATE_KEY`

## Gmail API setup

1. Create OAuth2 Desktop credentials in Google Cloud Console
2. Use OAuth2 Playground to exchange for a refresh token with scope:
   `https://www.googleapis.com/auth/gmail.send`
3. Store:
   - `GMAIL_CLIENT_ID`
   - `GMAIL_CLIENT_SECRET`
   - `GMAIL_REFRESH_TOKEN`
   - `GMAIL_FROM_ADDRESS`

## Admin login

- Set `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`, `ADMIN_SEED_NAME` in `.env`
- Run `npm run db:seed` to create the bcrypt-hashed admin user
- Login at `https://yourdomain.com/admin/login`

## Firewall note

The provision script configures UFW to allow only ports 22, 80, and 443. Port 3000 is intentionally closed to the public. The Next.js process is reachable only through nginx on the loopback interface.

## Additional Requirements

- All monetary values stored as integer cents in the database; formatted as dollars only in the UI
- All dates stored as UTC; displayed in local time in the UI
- Rate limiting:
  - `POST /api/sponsorships` and `POST /api/create-payment-intent` use a simple in-memory counter.
  - External store (Redis/Upstash) is required for true rate limiting across PM2 cluster workers.
- All API routes return consistent JSON error shapes: `{ error: string, code?: string }`
- Never log or expose Stripe secret keys, GCS private keys, or Gmail credentials
- Stripe webhook route reads the raw request body buffer for signature verification

