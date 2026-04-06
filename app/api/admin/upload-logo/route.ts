import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";

import { requireAdminRole } from "@/auth";
import { jsonError } from "@/lib/api";
import { generateSignedUploadUrl } from "@/lib/gcs";
import { requireDb } from "@/lib/db";
import { invalidateSettingsCache } from "@/lib/settings";
import { auditLog } from "@/lib/audit";
import { settings } from "@/db/schema";

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
] as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
};

const BodySchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(ALLOWED_MIME_TYPES, {
    message: "File type not allowed. Accepted: PNG, JPEG, SVG, WebP.",
  }),
});

export async function POST(req: Request) {
  try {
    const session = await requireAdminRole();
    if (!session) return jsonError("Forbidden", 403, "FORBIDDEN");

    const body = BodySchema.parse(await req.json());

    const ext = MIME_TO_EXT[body.contentType] ?? "";
    const objectFilename = `site-logo-${randomUUID()}${ext}`;

    const { signedUrl, publicUrl } = await generateSignedUploadUrl(
      objectFilename,
      body.contentType,
      "site"
    );

    // Save the public URL to settings
    const db = requireDb();
    const key = "hero_logo_url";
    const existing = await db.select().from(settings).where(eq(settings.key, key));
    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ value: publicUrl, updated_at: sql`now()` })
        .where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value: publicUrl });
    }

    invalidateSettingsCache();

    auditLog({
      event: "hero_logo_uploaded",
      actor: session.user?.email ?? "unknown",
      detail: { publicUrl },
    });

    return NextResponse.json({ signedUrl, publicUrl }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error("Logo upload URL generation failed:", err);
    return jsonError("Failed to generate upload URL", 400, "UPLOAD_LOGO_FAILED");
  }
}
