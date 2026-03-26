import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { requireDb } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { getAdminServerSession } from "@/auth";
import { auditLog } from "@/lib/audit";
import { sponsorships } from "@/db/schema";

const BodySchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  notes: z.string().optional(),
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
    } = {};
    if (body.status) set.status = body.status;
    if (body.notes !== undefined) set.notes = body.notes;

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

