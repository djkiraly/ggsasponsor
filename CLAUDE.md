# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Build & Development Commands

```bash
npm run dev          # Local dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run db:push      # Enable pgcrypto extension + push Drizzle schema to DB
npm run db:seed      # Seed admin user (uses ADMIN_SEED_* env vars)
```

## Architecture

GGSA Sponsorship Portal — a Next.js 16 app (App Router) where businesses submit sponsorship applications with file uploads and payments. Admins manage submissions through a protected dashboard.

**Core flow:** Public form (`components/PublicSponsorshipForm.tsx`) -> GCS file upload via signed URLs -> Stripe payment -> DB record -> Stripe webhook confirms payment -> Gmail receipt sent.

### Key integrations

| Integration | Config location | Notes |
|---|---|---|
| PostgreSQL (Neon serverless) | `lib/db.ts`, `db/schema.ts` | Drizzle ORM. All money as integer cents. |
| Stripe | `lib/stripe.ts` | Payment Elements (card + ACH). Webhook at `/api/stripe-webhook` requires raw body for signature verification. |
| Google Cloud Storage | `lib/gcs.ts` | Signed URLs (5-min expiry) for direct browser uploads. |
| Gmail API | `lib/email.ts` | OAuth2 refresh token. HTML receipt templates. |
| NextAuth | `auth.ts` | Credentials provider, JWT strategy. Login at `/admin/login`, API base at `/api/admin/login`. |

### Database schema (`db/schema.ts`)

Three tables: `sponsorships` (submissions with payment/file tracking), `settings` (key-value config for pricing/org info), `admin_users` (bcrypt-hashed credentials).

### API routes

- Public: `/api/sponsorships` (POST), `/api/create-payment-intent` (POST), `/api/upload-url` (POST), `/api/settings` (GET), `/api/healthz` (GET)
- Webhook: `/api/stripe-webhook` (POST, signature-verified)
- Admin (session-protected): `/api/admin/sponsorships`, `/api/admin/sponsorships/[id]`, `/api/admin/settings`

Rate limiting (`lib/rate-limit.ts`) is in-memory — not safe across PM2 cluster workers.

### Deployment

Production runs on a VPS with nginx reverse proxy -> PM2 cluster -> Next.js on 127.0.0.1:3000. Config in `deploy/` (nginx conf, PM2 ecosystem, provisioning/deploy scripts). Nginx has special handling for the Stripe webhook endpoint (no buffering).

## Conventions

- React Compiler is enabled (`next.config.ts: reactCompiler: true`) — do not add manual `useMemo`/`useCallback` unless profiling shows the compiler missed an optimization.
- Path alias: `@/*` maps to project root.
- Zod validation schemas live in `lib/validations.ts`.
- API response helpers in `lib/api.ts`.
- Environment variables are documented in `.env.example`.
