import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { requireDb } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { getAdminServerSession, requireAdminRole } from "@/auth";
import { auditLog } from "@/lib/audit";
import { sponsorships } from "@/db/schema";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminServerSession();
    if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");

    const db = requireDb();
    const { id: rawId } = await context.params;
    const id = z.string().uuid().safeParse(rawId);
    if (!id.success) return jsonError("Invalid sponsorship ID", 400, "INVALID_ID");

    const rows = await db
      .select()
      .from(sponsorships)
      .where(eq(sponsorships.id, id.data));

    if (rows.length === 0) return jsonError("Submission not found", 404, "NOT_FOUND");

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("Admin sponsorship read failed:", err);
    return jsonError("Failed to load sponsorship", 500, "ADMIN_SPONSORSHIP_READ_FAILED");
  }
}

const BodySchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  notes: z.string().optional(),
  logo_gcs_url: z.string().url().optional(),
  banner_gcs_url: z.string().url().optional(),
  stripe_payment_status: z.enum(["pending", "succeeded", "failed"]).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminServerSession();
    if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");

    const db = requireDb();
    const body = BodySchema.parse(await req.json());
    const { id: rawId } = await context.params;
    const id = z.string().uuid().safeParse(rawId);
    if (!id.success) return jsonError("Invalid sponsorship ID", 400, "INVALID_ID");

    const set: {
      status?: "pending" | "approved" | "rejected";
      notes?: string;
      logo_gcs_url?: string;
      banner_gcs_url?: string;
      stripe_payment_status?: "pending" | "succeeded" | "failed";
    } = {};
    const role = (session.user as { role?: string })?.role;

    // Status changes require admin role
    if (body.status) {
      if (role !== "admin") {
        return jsonError("Only admins can change submission status", 403, "FORBIDDEN");
      }
      set.status = body.status;
    }
    // Payment status changes require admin role (e.g., marking check as posted)
    if (body.stripe_payment_status) {
      if (role !== "admin") {
        return jsonError("Only admins can change payment status", 403, "FORBIDDEN");
      }
      set.stripe_payment_status = body.stripe_payment_status;
    }
    if (body.notes !== undefined) set.notes = body.notes;
    if (body.logo_gcs_url) set.logo_gcs_url = body.logo_gcs_url;
    if (body.banner_gcs_url) set.banner_gcs_url = body.banner_gcs_url;

    if (Object.keys(set).length === 0) {
      return jsonError("No update fields provided", 400, "NO_FIELDS");
    }

    const updated = await db
      .update(sponsorships)
      .set(set)
      .where(eq(sponsorships.id, id.data));

    auditLog({
      event: "sponsorship_updated",
      actor: session.user?.email ?? "unknown",
      detail: { sponsorshipId: id.data, fields: Object.keys(set) },
    });

    return NextResponse.json({ success: true, updated }, { status: 200 });
  } catch (err) {
    console.error("Admin sponsorship update failed:", err);
    return NextResponse.json(
      { error: "Failed to update sponsorship", code: "ADMIN_SPONSORSHIPS_UPDATE_FAILED" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminRole();
    if (!session) return jsonError("Forbidden", 403, "FORBIDDEN");

    const db = requireDb();
    const { id: rawId } = await context.params;
    const id = z.string().uuid().safeParse(rawId);
    if (!id.success) return jsonError("Invalid sponsorship ID", 400, "INVALID_ID");

    const existing = await db.select({ id: sponsorships.id }).from(sponsorships).where(eq(sponsorships.id, id.data));
    if (existing.length === 0) return jsonError("Submission not found", 404, "NOT_FOUND");

    await db.delete(sponsorships).where(eq(sponsorships.id, id.data));

    auditLog({
      event: "sponsorship_deleted",
      actor: session.user?.email ?? "unknown",
      detail: { sponsorshipId: id.data },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin sponsorship delete failed:", err);
    return jsonError("Failed to delete sponsorship", 500, "ADMIN_SPONSORSHIP_DELETE_FAILED");
  }
}

