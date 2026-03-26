import Stripe from "stripe";
import { getSettings } from "@/lib/settings";

const API_VERSION = "2026-02-25.clover";

/**
 * Resolve Stripe config from DB settings (preferred) with env var fallback.
 */
async function getStripeConfig() {
  let s: Record<string, string> = {};
  try {
    s = await getSettings();
  } catch {
    // DB not available — fall through to env vars only
  }

  const secretKey = s.stripe_secret_key || process.env.STRIPE_SECRET_KEY;
  const webhookSecret = s.stripe_webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;
  const publishableKey = s.stripe_publishable_key || process.env.STRIPE_PUBLISHABLE_KEY;

  return { secretKey, webhookSecret, publishableKey };
}

/** Get a Stripe client instance. Returns null if not configured. */
export async function getStripe(): Promise<Stripe | null> {
  const { secretKey } = await getStripeConfig();
  if (!secretKey) return null;
  return new Stripe(secretKey, { apiVersion: API_VERSION });
}

/** Get the webhook secret for signature verification. */
export async function getWebhookSecret(): Promise<string | undefined> {
  const { webhookSecret } = await getStripeConfig();
  return webhookSecret || undefined;
}

/** Get the publishable key for frontend use. */
export async function getPublishableKey(): Promise<string | undefined> {
  const { publishableKey } = await getStripeConfig();
  return publishableKey || undefined;
}
