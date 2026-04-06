import { NextResponse } from "next/server";

import { requireAdminRole } from "@/auth";
import { jsonError } from "@/lib/api";
import { getStripe, getPublishableKey } from "@/lib/stripe";

export async function POST() {
  try {
    const session = await requireAdminRole();
    if (!session) return jsonError("Forbidden", 403, "FORBIDDEN");

    const stripe = await getStripe();
    const publishableKey = await getPublishableKey();

    if (!stripe) {
      return NextResponse.json({
        success: false,
        error: "Stripe secret key is not configured.",
      });
    }

    // Validate the secret key by fetching account info
    const account = await stripe.accounts.retrieve();

    return NextResponse.json({
      success: true,
      accountId: account.id,
      publishableKeySet: !!publishableKey,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message });
  }
}
