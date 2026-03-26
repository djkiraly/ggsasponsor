# nginx configuration notes (GGSA)

This document explains the “why” behind the non-obvious directives in `ggsa.conf`.

## `proxy_request_buffering off` for `/api/stripe-webhook`
Stripe verifies webhook signatures against the exact raw bytes of the HTTP request body.
If nginx buffers, re-chunks, or otherwise changes the body stream before proxying, signature
verification can fail with a `400` response.

Setting `proxy_request_buffering off` streams the request body directly to Next.js without
modifying it.

## `X-Forwarded-Proto`
Next.js (and NextAuth) build absolute HTTPS URLs using request context.
When running behind nginx, the app must see the *original* scheme (`http` vs `https`).
`X-Forwarded-Proto` ensures the app gets the correct value so callback URLs are generated
with `https` in production.

## `client_max_body_size 30M`
nginx enforces the maximum allowed request body size.
Banner uploads can be up to `25 MB`, so nginx must be configured above that threshold
to avoid `413 Payload Too Large` errors.

Next.js body size limits are separate; nginx is the first gate.

## `/_next/static/` cache block (`immutable` + 1 year)
Next.js fingerprints static assets with content hashes in filenames.
Because the filename changes when content changes, it is safe to cache “forever”.
This reduces Node.js load and speeds up repeated asset requests.

## `HOSTNAME=127.0.0.1` in `.env` (bind loopback only)
Binding the Next.js server to loopback (`127.0.0.1`) prevents direct public access to port `3000`.
Only nginx can reach the app, which is desired for security (nginx is the public entry point).

## `trustHost: true` in `next.config.js`
This instructs Next.js to trust proxy headers when deriving the request’s host/scheme information.
Without it, frameworks like NextAuth can generate incorrect callback URLs behind a reverse proxy.

