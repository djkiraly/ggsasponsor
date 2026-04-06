# GGSA Sponsorship Portal — Production Deployment Guide

This guide covers deploying the GGSA Sponsorship Portal to a fresh Ubuntu VPS with nginx, PM2, and Let's Encrypt SSL.

---

## Prerequisites

- **Server:** Ubuntu 22.04+ VPS with a public IPv4 address (DigitalOcean, Linode, Vultr, etc.)
- **Domain:** A domain with DNS A record (and optional `www` CNAME) pointing to the server IP
- **Accounts:** Neon.tech (Postgres), Stripe, Google Cloud (GCS + Gmail API)
- **Local:** Git repository pushed to a remote (GitHub, etc.)

---

## Step 1 — Provision the Server

SSH into your server as root and run the provisioning script. This installs Node.js 20, nginx, PM2, UFW firewall, and creates an app user.

```bash
# Upload or clone the repo temporarily to get the deploy scripts
git clone <your-repo-url> /tmp/ggsa-setup
cd /tmp/ggsa-setup

# Run provisioning (replace "appuser" and "yourdomain.com")
sudo bash deploy/scripts/provision.sh appuser yourdomain.com
```

**What this does:**
- Updates system packages
- Installs Node.js 20, nginx, PM2, fail2ban, build-essential
- Configures UFW firewall (allows only ports 22, 80, 443)
- Creates the app user and `/var/www/ggsa` directory
- Installs the nginx site config
- Configures PM2 to start on boot

---

## Step 2 — Clone and Configure

Switch to the app user, clone the repo, and set up environment variables.

```bash
# Switch to app user
su - appuser

# Clone the repo
git clone <your-repo-url> /var/www/ggsa
cd /var/www/ggsa

# Create the environment file from template
cp .env.example .env
nano .env
```

### Required `.env` values

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon.tech Postgres connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `NEXTAUTH_SECRET` | Random string, **minimum 32 characters** | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full public URL of the site | `https://yourdomain.com` |
| `NODE_ENV` | Must be `production` | `production` |
| `PORT` | App port (nginx proxies to this) | `3000` |
| `HOSTNAME` | Bind to loopback only | `127.0.0.1` |
| `ADMIN_SEED_EMAIL` | Admin login email | `admin@yourdomain.com` |
| `ADMIN_SEED_PASSWORD` | Admin login password (use a strong one) | `YourStr0ngP@ssword!` |
| `ADMIN_SEED_NAME` | Admin display name | `Admin` |

**Stripe, GCS, and Gmail credentials are optional at this stage** — they can be configured later through the Admin Panel (Settings page) after first login. If you prefer to set them in `.env`, they will work as fallbacks.

---

## Step 3 — Provision SSL Certificate

DNS must be live (A record pointing to server IP) before this step.

```bash
# As root:
sudo bash /var/www/ggsa/deploy/scripts/setup-ssl.sh yourdomain.com admin@yourdomain.com
```

**What this does:**
- Installs Certbot with the nginx plugin
- Obtains a Let's Encrypt certificate for `yourdomain.com` and `www.yourdomain.com`
- Replaces `yourdomain.com` placeholders in the nginx config with your actual domain
- Enables automatic certificate renewal (twice daily via systemd timer)

---

## Step 4 — Build and Start

```bash
# As appuser:
cd /var/www/ggsa

# Install dependencies (production only)
npm ci --omit=dev

# Push database schema to Neon
npm run db:push

# Seed initial settings and admin user
npm run db:seed

# Build the Next.js production bundle
npm run build

# Start with PM2 in cluster mode
pm2 start deploy/ecosystem.config.js --env production

# Save PM2 process list (survives reboots)
pm2 save
```

---

## Step 5 — Verify

```bash
# Test the health endpoint
curl -s https://yourdomain.com/api/healthz
# Expected: {"status":"ok"}

# Check nginx
sudo nginx -t && sudo systemctl status nginx

# Check PM2 processes
pm2 status
pm2 logs ggsa --lines 20

# Test SSL renewal
sudo certbot renew --dry-run
```

Then open `https://yourdomain.com/admin/login` in your browser and log in with the admin credentials from your `.env`.

---

## Step 6 — Configure Integrations (Admin Panel)

After logging in, go to **Settings** and configure each tab:

### Payments (Stripe)
1. Go to the **Payments** tab
2. Enter your Stripe Secret Key, Publishable Key, and Webhook Secret
3. Click **Test Connection** to verify
4. Set up the webhook endpoint in Stripe Dashboard:
   - URL: `https://yourdomain.com/api/stripe-webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

### Cloud Storage (GCS)
1. Go to the **Cloud Storage** tab
2. Upload your GCS service account JSON key file, or enter credentials manually
3. Enter the bucket name
4. Click **Test Connection** to verify
5. Configure CORS on the bucket to allow PUT from `https://yourdomain.com`

### Email (Gmail)
1. Go to the **Email** tab
2. Enter Gmail OAuth2 credentials (Client ID, Client Secret, Refresh Token, From Address)
3. Click **Test Connection** to verify it authenticates

---

## Subsequent Deployments

After pushing code changes to your remote repository:

```bash
# As appuser on the server:
bash /var/www/ggsa/deploy/scripts/deploy.sh
```

This script:
1. Pulls latest code from `main`
2. Installs dependencies (`npm ci --omit=dev`)
3. Runs database migrations (`npm run db:push`)
4. Rebuilds Next.js (`npm run build`)
5. Reloads PM2 with zero downtime (`pm2 reload`)

---

## Architecture Overview

```
Internet
   │
   ▼
┌──────────┐     ┌─────────────────────────────┐
│  nginx   │────▶│  Next.js (PM2 cluster)      │
│  :80/:443│     │  127.0.0.1:3000             │
│  TLS     │     │  1 worker per CPU core       │
└──────────┘     └─────────────────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  Neon Postgres   │
                 │  (serverless)    │
                 └─────────────────┘
```

- **nginx** handles TLS termination, static asset caching, security headers, and reverse proxying
- **PM2** runs Next.js in cluster mode with automatic restarts and zero-downtime reloads
- **Port 3000** is bound to `127.0.0.1` only — not accessible from the internet
- **UFW firewall** only allows ports 22 (SSH), 80 (HTTP→HTTPS redirect), and 443 (HTTPS)

---

## Operational Commands

| Task | Command |
|------|---------|
| View app logs | `pm2 logs ggsa --lines 100` |
| Monitor processes | `pm2 monit` |
| Restart app | `pm2 restart ggsa` |
| Stop app | `pm2 stop ggsa` |
| Check nginx config | `sudo nginx -t` |
| Reload nginx | `sudo systemctl reload nginx` |
| View nginx access logs | `tail -f /var/log/nginx/ggsa.access.log` |
| View nginx error logs | `tail -f /var/log/nginx/ggsa.error.log` |
| Check SSL expiry | `sudo certbot certificates` |
| Manual SSL renewal | `sudo certbot renew` |
| Check firewall status | `sudo ufw status` |
| Re-seed admin password | Edit `ADMIN_SEED_PASSWORD` in `.env`, then `npm run db:seed` |

---

## Troubleshooting

### App won't start
```bash
pm2 logs ggsa --err --lines 50    # Check error logs
cat /var/www/ggsa/.env             # Verify env vars are set
node -e "console.log(process.version)"  # Verify Node.js 20+
```

### 502 Bad Gateway from nginx
The Next.js process isn't running or isn't bound to port 3000:
```bash
pm2 status                        # Is "ggsa" online?
pm2 restart ggsa                  # Restart it
curl http://127.0.0.1:3000/api/healthz  # Test directly
```

### Stripe webhook returning 400
The webhook signature verification requires the raw request body. Verify nginx config has `proxy_request_buffering off` for the webhook route:
```bash
grep -A5 "stripe-webhook" /etc/nginx/sites-available/ggsa
```

### SSL certificate not renewing
```bash
sudo certbot renew --dry-run      # Test renewal
sudo systemctl status certbot.timer  # Check timer is active
```

### Database connection errors
Verify `DATABASE_URL` in `.env` is correct and the Neon database is accessible:
```bash
node -e "const{Pool}=require('@neondatabase/serverless');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query('SELECT 1').then(()=>console.log('OK')).catch(console.error)"
```

---

## Security Checklist

- [ ] `NEXTAUTH_SECRET` is a unique random string (min 32 characters)
- [ ] Admin password is strong and not reused
- [ ] `.env` file permissions are restricted: `chmod 600 /var/www/ggsa/.env`
- [ ] UFW firewall is enabled and only allows 22/80/443
- [ ] Stripe keys are live keys (not test keys) in production
- [ ] SSL certificate is valid and auto-renewal is working
- [ ] nginx blocks access to hidden files (`.env`, `.git`)
- [ ] `HOSTNAME=127.0.0.1` is set (app not directly accessible on port 3000)
