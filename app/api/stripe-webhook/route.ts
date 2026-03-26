import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { eq } from "drizzle-orm";

import { requireDb } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { getStripe, getWebhookSecret } from "@/lib/stripe";
import { sponsorships } from "@/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = await getStripe();
  if (!stripe) return jsonError("Stripe is not configured", 500, "STRIPE_MISSING");

  const webhookSecret = await getWebhookSecret();
  if (!webhookSecret) return jsonError("Stripe webhook secret is not configured", 500, "WEBHOOK_SECRET_MISSING");

  try {
    // IMPORTANT: read the raw bytes for signature verification.
    // nginx must pass the request body unmodified (proxy_request_buffering off).
    const buf = Buffer.from(await req.arrayBuffer());
    const signature = req.headers.get("stripe-signature");
    if (!signature) return jsonError("Missing stripe signature", 400, "SIGNATURE_MISSING");

    const event = stripe.webhooks.constructEvent(buf, signature, webhookSecret);
    const paymentIntent = event.data.object as { id: string };

    if (!paymentIntent?.id) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const status =
      event.type === "payment_intent.succeeded"
        ? "succeeded"
        : event.type === "payment_intent.payment_failed"
          ? "failed"
          : null;

    if (status) {
      const db = requireDb();
      await db
        .update(sponsorships)
        .set({ stripe_payment_status: status })
        .where(eq(sponsorships.stripe_payment_intent_id, paymentIntent.id));
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return jsonError("Webhook verification failed", 400, "STRIPE_WEBHOOK_FAILED");
  }
}
