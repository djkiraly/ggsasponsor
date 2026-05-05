# GGSA Sponsorship Portal — Manual Deployment Guide

This guide walks through every step by hand, without using the bundled provisioning scripts. It assumes the server already hosts other applications and has nginx, Node.js, or PM2 partially or fully installed. Each section explains **what** is needed and **why**, so you can adapt to your existing setup.

---

## What This Application Requires

| Component | Version | Purpose | Already have it? |
|-----------|---------|---------|-------------------|
| **Node.js** | 20+ | Runs the Next.js application | If shared, just verify the version |
| **npm** | Bundled with Node | Installs dependencies | Comes with Node.js |
| **PM2** | Any recent | Process manager — keeps the app alive, enables zero-downtime reloads | Can be shared across apps |
| **nginx** | Any recent | Reverse proxy, TLS termination, security headers | Almost certainly already installed if hosting other apps |
| **PostgreSQL** | 14+ | Database (hosted on Neon.tech, not on this server) | **No local install needed** — the app connects to a remote Neon database |
| **Certbot** | Any recent | SSL certificate management | May already be installed for other domains |
| **Git** | Any | Cloning and updating the repository | Almost certainly present |

**Not required:** Docker, Redis, any local database server. The database is hosted externally on Neon.tech.

---

## 1. Verify Prerequisites

```bash
# Check Node.js version (must be 20+)
node --version

# If not installed or too old:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Check PM2
pm2 --version

# If not installed:
sudo npm install -g pm2

# Check nginx
nginx -v

# Check Certbot
certbot --version
```

---

## 2. Choose a Directory and Port

Since other apps share this server, pick a directory and port that don't conflict.

| Setting | Default | Your choice |
|---------|---------|-------------|
| App directory | `/var/www/ggsa` | Any path you prefer |
| Internal port | `3000` | Any unused port (check with `ss -tlnp`) |

If you change the port from 3000, you must update it in:
- `.env` → `PORT=<your-port>`
- `deploy/ecosystem.config.js` → `env_production.PORT`
- The nginx config → every `proxy_pass http://127.0.0.1:<your-port>`

The rest of this guide uses `/var/www/ggsa` and port `3000`.

---

## 3. Clone the Repository

```bash
# Create directory and set ownership
sudo mkdir -p /var/www/ggsa
sudo chown $USER:$USER /var/www/ggsa

# Clone
git clone <your-repo-url> /var/www/ggsa
cd /var/www/ggsa
```

---

## 4. Create the Environment File

```bash
cp .env.example .env
chmod 600 .env    # Restrict permissions — contains secrets
nano .env
```

### Minimum required values for first boot

```env
# Database (get from Neon.tech dashboard)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# NextAuth (REQUIRED — app won't start without these)
NEXTAUTH_SECRET=<random-string-at-least-32-chars>
NEXTAUTH_URL=https://yourdomain.com

# App
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1

# Admin account (only needed for initial seed, can remove after)
ADMIN_SEED_EMAIL=admin@yourdomain.com
ADMIN_SEED_PASSWORD=<strong-password>
ADMIN_SEED_NAME=Admin
```

Generate the secret:
```bash
openssl rand -base64 32
```

**Stripe, GCS, and Gmail are optional here.** They can be configured through the Admin Settings page after first login.

---

## 5. Install Dependencies and Build

```bash
cd /var/www/ggsa

# Install production dependencies only
npm ci --omit=dev

# Push the database schema to Neon (creates tables)
npm run db:push

# Seed default settings and the admin user
npm run db:seed

# Build the Next.js production bundle
npm run build
```

The `npm run build` step creates the `.next/` directory. This takes 1-3 minutes depending on server specs.

---

## 6. Configure PM2

The app includes a PM2 config file at `deploy/ecosystem.config.js`. Review it and adjust if needed:

```bash
cat deploy/ecosystem.config.js
```

Key settings:
- `cwd`: Must match your app directory (default `/var/www/ggsa`)
- `instances: "max"`: One worker per CPU core. Change to a number (e.g., `2`) if sharing CPU with other apps
- `PORT`: Must match your chosen port
- `HOSTNAME: "127.0.0.1"`: Binds to loopback only — **do not change this**, nginx handles public traffic

**If you changed the app directory or port**, edit the file:
```bash
nano deploy/ecosystem.config.js
```

Start the app:
```bash
pm2 start deploy/ecosystem.config.js --env production
```

Verify it's running:
```bash
pm2 status
curl http://127.0.0.1:3008/api/healthz
# Expected: {"status":"ok"}
```

Save the process list so PM2 restarts it on reboot:
```bash
pm2 save
```

If PM2 startup hasn't been configured on this server yet:
```bash
pm2 startup
# Follow the printed command (run it as root/sudo)
```

---

## 7. Configure nginx

**Do not replace your existing nginx config.** Instead, add a new server block for this domain.

### 7a. Create the site config

```bash
sudo nano /etc/nginx/sites-available/ggsa
```

Paste the contents of `deploy/nginx/ggsa.conf` from this repository, then:

1. **Replace every `yourdomain.com`** with your actual domain
2. **Replace every `127.0.0.1:3000`** with your chosen port if different
3. **Comment out the SSL lines** (steps 7c–7d handle this after Certbot runs)

### 7b. Enable the site

```bash
sudo ln -sf /etc/nginx/sites-available/ggsa /etc/nginx/sites-enabled/ggsa

# Test config syntax
sudo nginx -t

# Reload (not restart — keeps other sites running)
sudo systemctl reload nginx
```

### 7c. Obtain SSL certificate

If you already have a wildcard certificate or manage SSL differently, skip this and point the config at your existing certs.

Otherwise, use Certbot:
```bash
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com --email admin@yourdomain.com
```

### 7d. Uncomment SSL lines and reload

After Certbot creates the certificate files, uncomment the SSL directives in `/etc/nginx/sites-available/ggsa` and update the paths if they differ from the defaults.

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Critical nginx details for this app

These are **not optional** — the app will malfunction without them:

| Directive | Location | Why |
|-----------|----------|-----|
| `proxy_request_buffering off` | `/api/stripe-webhook` block | Stripe webhook signature verification requires the exact raw bytes. If nginx buffers or re-encodes the body, signature checks fail with 400. |
| `proxy_buffering off` | `/api/stripe-webhook` block | Same reason — prevents nginx from modifying the response stream. |
| `client_max_body_size 30M` | Server block | Banner image uploads can be up to 25 MB. Without this, nginx rejects large uploads with 413. |
| `X-Real-IP` header | Proxy headers | The app reads this for rate limiting. Without it, all requests appear to come from the same IP. |
| `X-Forwarded-Proto` header | Proxy headers | NextAuth needs this to generate correct callback URLs behind a reverse proxy. |
| Hidden file block (`location ~ /\.`) | Server block | Prevents direct access to `.env`, `.git`, etc. through the browser. |

---

## 8. Verify the Full Stack

```bash
# 1. Health check (bypasses auth)
curl -s https://yourdomain.com/api/healthz

# 2. Public page loads
curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com
# Expected: 200

# 3. Admin login page loads
curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com/admin/login
# Expected: 200

# 4. PM2 is healthy
pm2 status

# 5. SSL certificate is valid
sudo certbot certificates

# 6. No errors in logs
pm2 logs ggsa --lines 20 --err
tail -20 /var/log/nginx/ggsa.error.log
```

Then open `https://yourdomain.com/admin/login` in a browser, log in, and configure Stripe/GCS/Gmail in the Settings page.

---

## 9. Updating the Application

When you push new code:

```bash
cd /var/www/ggsa

# Pull changes
git pull origin main

# Install any new dependencies
npm ci --omit=dev

# Apply any schema changes
npm run db:push

# Rebuild
npm run build

# Zero-downtime reload
pm2 reload ggsa --env production
```

---

## File Permissions Summary

```bash
# The .env file contains secrets — restrict to owner only
chmod 600 /var/www/ggsa/.env

# The app directory should be owned by the user PM2 runs as
chown -R appuser:appuser /var/www/ggsa

# PM2 log directory
sudo mkdir -p /var/log/pm2
sudo chown appuser:appuser /var/log/pm2
```

---

## Port Conflict Quick Reference

If port 3000 is taken by another app:

1. Pick a free port: `ss -tlnp | grep LISTEN`
2. Update these three locations:

| File | Line to change |
|------|---------------|
| `.env` | `PORT=<new-port>` |
| `deploy/ecosystem.config.js` | `env_production: { PORT: <new-port> }` |
| `/etc/nginx/sites-available/ggsa` | Every `proxy_pass http://127.0.0.1:<new-port>` |

3. Restart: `pm2 restart ggsa && sudo systemctl reload nginx`

---

## What Can Be Shared With Other Apps

| Component | Shareable? | Notes |
|-----------|-----------|-------|
| nginx | Yes | Just add a new `server` block — it won't affect other sites |
| PM2 | Yes | Each app gets its own named process. `pm2 status` shows all. |
| Node.js | Yes | One global install serves all apps (verify version 20+) |
| Certbot | Yes | Can manage multiple domains. Each gets its own cert. |
| UFW firewall | Yes | Ports 80/443 are already open if other web apps are running |
| PostgreSQL | N/A | Database is remote (Neon.tech) — nothing local to share or conflict with |
