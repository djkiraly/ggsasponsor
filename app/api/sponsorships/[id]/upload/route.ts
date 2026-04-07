import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { requireDb } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { sponsorships } from "@/db/schema";

const BodySchema = z.object({
  email: z.string().email(),
  logo_gcs_url: z.string().url().optional(),
  banner_gcs_url: z.string().url().optional(),
});

/**
 * Public endpoint that lets a sponsor attach/update logo or banner files
 * on their own submission. Requires the submission's email for verification.
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const db = requireDb();
    const { id: rawId } = await context.params;
    const id = z.string().uuid().safeParse(rawId);
    if (!id.success) return jsonError("Invalid submission ID", 400, "INVALID_ID");

    const body = BodySchema.parse(await req.json());

    if (!body.logo_gcs_url && !body.banner_gcs_url) {
      return jsonError("No file URL provided", 400, "NO_FILES");
    }

    // Verify the email matches the submission (proof of ownership)
    const rows = await db
      .select({ email: sponsorships.email })
      .from(sponsorships)
      .where(eq(sponsorships.id, id.data));

    if (rows.length === 0) return jsonError("Submission not found", 404, "NOT_FOUND");

    if (rows[0].email.toLowerCase() !== body.email.toLowerCase()) {
      return jsonError("Email does not match this submission", 403, "EMAIL_MISMATCH");
    }

    const set: { logo_gcs_url?: string; banner_gcs_url?: string } = {};
    if (body.logo_gcs_url) set.logo_gcs_url = body.logo_gcs_url;
    if (body.banner_gcs_url) set.banner_gcs_url = body.banner_gcs_url;

    await db.update(sponsorships).set(set).where(eq(sponsorships.id, id.data));

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError("Invalid request", 400, "VALIDATION_ERROR");
    }
    console.error("Public upload save failed:", err);
    return jsonError("Failed to save upload", 500, "UPLOAD_SAVE_FAILED");
  }
}
