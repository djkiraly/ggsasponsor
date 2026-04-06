import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";

import { requireAdminRole } from "@/auth";
import { jsonError } from "@/lib/api";
import { requireDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { invalidateSettingsCache } from "@/lib/settings";
import { auditLog } from "@/lib/audit";
import { settings } from "@/db/schema";

const KeyFileSchema = z.object({
  project_id: z.string().min(1),
  client_email: z.string().email(),
  private_key: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await requireAdminRole();
    if (!session) return jsonError("Forbidden", 403, "FORBIDDEN");

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return jsonError("No file provided", 400, "NO_FILE");
    }

    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return jsonError("File is not valid JSON", 400, "INVALID_JSON");
    }

    const result = KeyFileSchema.safeParse(parsed);
    if (!result.success) {
      return jsonError(
        "JSON file must contain project_id, client_email, and private_key fields.",
        400,
        "MISSING_FIELDS"
      );
    }

    const { project_id, client_email, private_key } = result.data;

    // Save extracted fields to settings
    const db = requireDb();
    const entries: [string, string][] = [
      ["gcs_project_id", project_id],
      ["gcs_client_email", client_email],
      ["gcs_private_key", encrypt(private_key)],
    ];

    for (const [key, value] of entries) {
      const existing = await db.select().from(settings).where(eq(settings.key, key));
      if (existing.length > 0) {
        await db
          .update(settings)
          .set({ value, updated_at: sql`now()` })
          .where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value });
      }
    }

    invalidateSettingsCache();

    auditLog({
      event: "gcs_key_uploaded",
      actor: session.user?.email ?? "unknown",
      detail: { project_id, client_email },
    });

    return NextResponse.json({
      success: true,
      projectId: project_id,
      clientEmail: client_email,
    });
  } catch (err) {
    console.error("GCS key upload failed:", err);
    return jsonError("Failed to process key file", 400, "UPLOAD_GCS_KEY_FAILED");
  }
}
