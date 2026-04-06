import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { jsonError, getClientIp } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe";
import { CreatePaymentIntentBodySchema, PaymentMethodType, SponsorshipType } from "@/lib/validations";
import { settings } from "@/db/schema";

const sponsorshipPriceKey: Record<SponsorshipType, string> = {
  team: "price_team_cents",
  banner: "price_banner_cents",
  both: "price_both_cents",
};

export async function POST(req: Request) {
  // Simple in-memory rate limit (per-process).
  // NOTE: Not cluster-safe across PM2 workers; switch to Redis/Upstash for true limiting.
  const ip = getClientIp(req);
  const rl = checkRateLimit({
    key: `create-payment-intent:${ip}`,
    windowMs: 60_000,
    max: 30,
  });
  if (!rl.allowed) return jsonError("Too many requests", 429, "RATE_LIMITED");

  try {
    const db = requireDb();
    const body = CreatePaymentIntentBodySchema.parse(await req.json());

    const stripe = await getStripe();
    if (!stripe) {
      return jsonError("Stripe is not configured", 500, "STRIPE_MISSING");
    }

    const priceKey = sponsorshipPriceKey[body.sponsorshipType];
    const rows = await db.select().from(settings).where(eq(settings.key, priceKey));
    const priceCentsRaw = rows[0]?.value;

    if (!priceCentsRaw) {
      return jsonError("Pricing not found for sponsorship type", 500, "PRICE_MISSING");
    }

    const priceCents = Number.parseInt(priceCentsRaw, 10);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      return jsonError("Invalid pricing configuration", 500, "PRICE_INVALID");
    }

    const stripePaymentMethodTypes: string[] =
      body.paymentMethodType === "card" ? ["card"] : ["us_bank_account"];

    const paymentIntent = await stripe.paymentIntents.create({
      amount: priceCents,
      currency: "usd",
      payment_method_types: stripePaymentMethodTypes,
      metadata: {
        sponsorship_type: body.sponsorshipType,
        applicant_email: body.applicantEmail ?? "",
      },
    });

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret ?? "",
        amount: priceCents / 100,
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError("Invalid request data", 400, "VALIDATION_ERROR");
    }
    console.error("Payment intent creation failed:", err);
    return jsonError("Failed to create payment intent", 400, "CREATE_PAYMENT_INTENT_FAILED");
  }
}

