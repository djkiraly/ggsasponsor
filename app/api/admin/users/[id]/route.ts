import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { requireAdminRole } from "@/auth";
import { jsonError } from "@/lib/api";
import { requireDb } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { adminUsers, settings } from "@/db/schema";
import { sendEmail, buildAccountActivatedEmail } from "@/lib/email";

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["admin", "user"]).optional(),
  is_active: z.boolean().optional(),
});

function getBaseUrl() {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminRole();
    if (!session) return jsonError("Forbidden", 403, "FORBIDDEN");

    const { id } = await params;
    const body = UpdateUserSchema.parse(await req.json());
    const db = requireDb();

    // Verify user exists
    const existing = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    if (existing.length === 0) return jsonError("User not found", 404, "NOT_FOUND");

    const user = existing[0];

    // Prevent demoting yourself
    const currentUserId = (session.user as { id?: string })?.id;
    if (id === currentUserId && body.role && body.role !== "admin") {
      return jsonError("You cannot change your own role", 400, "SELF_ROLE_CHANGE");
    }

    const updates: Record<string, string | boolean> = {};
    if (body.name) updates.name = body.name;
    if (body.email) updates.email = body.email;
    if (body.role) updates.role = body.role;
    if (body.password) updates.password_hash = await bcrypt.hash(body.password, 12);
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return jsonError("No updates provided", 400, "NO_UPDATES");
    }

    await db.update(adminUsers).set(updates).where(eq(adminUsers.id, id));

    // Send activation email if user was just activated
    if (body.is_active === true && !user.is_active) {
      try {
        const settingRows = await db.select().from(settings);
        const settingsMap: Record<string, string> = {};
        for (const row of settingRows) settingsMap[row.key] = row.value;

        const loginUrl = `${getBaseUrl()}/admin/login`;
        const html = buildAccountActivatedEmail(user.name, loginUrl, settingsMap);

        await sendEmail({
          to: user.email,
          subject: "Your account has been activated",
          html,
        });
      } catch (err) {
        console.error("Failed to send activation email:", err);
      }
    }

    auditLog({
      event: "user_updated",
      actor: session.user?.email ?? "unknown",
      detail: { userId: id, fields: Object.keys(updates).filter((k) => k !== "password_hash") },
    });

    const updated = await db
      .select({
        id: adminUsers.id,
        name: adminUsers.name,
        email: adminUsers.email,
        role: adminUsers.role,
        email_verified: adminUsers.email_verified,
        is_active: adminUsers.is_active,
        created_at: adminUsers.created_at,
      })
      .from(adminUsers)
      .where(eq(adminUsers.id, id));

    return NextResponse.json(updated[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return jsonError("A user with that email already exists", 409, "DUPLICATE_EMAIL");
    }
    console.error("User update failed:", err);
    return jsonError("Failed to update user", 500, "USER_UPDATE_FAILED");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminRole();
    if (!session) return jsonError("Forbidden", 403, "FORBIDDEN");

    const { id } = await params;
    const db = requireDb();

    // Prevent self-deletion
    const currentUserId = (session.user as { id?: string })?.id;
    if (id === currentUserId) {
      return jsonError("You cannot delete your own account", 400, "SELF_DELETE");
    }

    const existing = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    if (existing.length === 0) return jsonError("User not found", 404, "NOT_FOUND");

    await db.delete(adminUsers).where(eq(adminUsers.id, id));

    auditLog({
      event: "user_deleted",
      actor: session.user?.email ?? "unknown",
      detail: { userId: id, email: existing[0].email },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("User deletion failed:", err);
    return jsonError("Failed to delete user", 500, "USER_DELETE_FAILED");
  }
}
