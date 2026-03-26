import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";

import { requireDb } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { getAdminServerSession } from "@/auth";
import { auditLog } from "@/lib/audit";
import { encrypt } from "@/lib/crypto";
import { invalidateSettingsCache } from "@/lib/settings";
import { settings } from "@/db/schema";

const ALLOWED_SETTING_KEYS = [
  // General
  "price_team_cents",
  "price_banner_cents",
  "price_both_cents",
  "season_year",
  "contact_email",
  "org_name",
  "website",
  // GCS
  "gcs_bucket_name",
  "gcs_project_id",
  "gcs_client_email",
  "gcs_private_key",
  // Gmail
  "gmail_client_id",
  "gmail_client_secret",
  "gmail_refresh_token",
  "gmail_from_address",
  // Stripe
  "stripe_secret_key",
  "stripe_publishable_key",
  "stripe_webhook_secret",
] as const;

const SENSITIVE_KEYS = new Set([
  "gcs_private_key",
  "gmail_client_secret",
  "gmail_refresh_token",
  "stripe_secret_key",
  "stripe_webhook_secret",
]);

const MASK = "********";

const allowedKeySet = new Set<string>(ALLOWED_SETTING_KEYS);

const BodySchema = z.object({
  updates: z.record(z.string().min(1), z.string()),
});

export async function GET() {
  try {
    const session = await getAdminServerSession();
    if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");

    const db = requireDb();
    const rows = await db.select().from(settings);

    const result: Record<string, string> = {};
    for (const row of rows) {
      if (SENSITIVE_KEYS.has(row.key) && row.value) {
        // Return masked value so UI knows a value is set, but never expose it
        result[row.key] = MASK;
      } else {
        result[row.key] = row.value;
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Admin settings read failed:", err);
    return jsonError("Failed to load settings", 500, "ADMIN_SETTINGS_READ_FAILED");
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAdminServerSession();
    if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");

    const db = requireDb();
    const body = BodySchema.parse(await req.json());

    const updates = body.updates;
    const keys = Object.keys(updates);
    if (keys.length === 0) return jsonError("No updates provided", 400, "NO_UPDATES");

    const invalid = keys.filter((k) => !allowedKeySet.has(k));
    if (invalid.length > 0) {
      return jsonError(`Unknown setting keys: ${invalid.join(", ")}`, 400, "INVALID_KEYS");
    }

    let updatedCount = 0;
    for (const key of keys) {
      let value = updates[key];

      // Skip masked values — the UI sends "********" when the user hasn't changed the field
      if (SENSITIVE_KEYS.has(key) && value === MASK) continue;

      // Encrypt sensitive values before storing
      if (SENSITIVE_KEYS.has(key) && value) {
        value = encrypt(value);
      }

      // Upsert: update if exists, insert if not
      const existing = await db.select().from(settings).where(eq(settings.key, key));
      if (existing.length > 0) {
        const res = await db
          .update(settings)
          .set({ value, updated_at: sql`now()` })
          .where(eq(settings.key, key));
        updatedCount += res.rowCount ?? 0;
      } else {
        await db.insert(settings).values({ key, value });
        updatedCount += 1;
      }
    }

    invalidateSettingsCache();

    auditLog({
      event: "settings_updated",
      actor: session.user?.email ?? "unknown",
      detail: { keys },
    });

    return NextResponse.json({ success: true, updatedCount }, { status: 200 });
  } catch (err) {
    console.error("Admin settings update failed:", err);
    return NextResponse.json({ error: "Failed to update settings", code: "ADMIN_SETTINGS_UPDATE_FAILED" }, { status: 400 });
  }
}
