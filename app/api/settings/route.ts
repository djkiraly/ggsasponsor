import { NextResponse } from "next/server";

import { settings } from "@/db/schema";
import { requireDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Keys that are safe to expose publicly. */
const PUBLIC_KEYS = new Set([
  "org_name",
  "contact_email",
  "website",
  "season_year",
  "price_team_cents",
  "price_banner_cents",
  "price_both_cents",
  "stripe_publishable_key",
  "hero_heading",
  "hero_body",
  "hero_logo_url",
  "recaptcha_enabled",
  "recaptcha_site_key",
]);

export async function GET() {
  try {
    const db = requireDb();
    const rows = await db.select().from(settings);
    const out: Record<string, string> = {};
    for (const row of rows) {
      if (PUBLIC_KEYS.has(row.key)) {
        out[row.key] = row.value;
      }
    }
    return NextResponse.json(out, { status: 200 });
  } catch (err) {
    console.error("Public settings read failed:", err);
    return NextResponse.json({ error: "Failed to load settings", code: "SETTINGS_READ_FAILED" }, { status: 500 });
  }
}
