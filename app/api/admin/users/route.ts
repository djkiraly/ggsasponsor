import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { requireAdminRole } from "@/auth";
import { jsonError } from "@/lib/api";
import { requireDb } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { adminUsers } from "@/db/schema";

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "user"]),
});

export async function GET() {
  try {
    const session = await requireAdminRole();
    if (!session) return jsonError("Forbidden", 403, "FORBIDDEN");

    const db = requireDb();
    const rows = await db
      .select({
        id: adminUsers.id,
        name: adminUsers.name,
        email: adminUsers.email,
        role: adminUsers.role,
        email_verified: adminUsers.email_verified,
        is_active: adminUsers.is_active,
        created_at: adminUsers.created_at,
      })
      .from(adminUsers);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Users list failed:", err);
    return jsonError("Failed to load users", 500, "USERS_LIST_FAILED");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdminRole();
    if (!session) return jsonError("Forbidden", 403, "FORBIDDEN");

    const body = CreateUserSchema.parse(await req.json());
    const db = requireDb();

    const passwordHash = await bcrypt.hash(body.password, 12);

    const inserted = await db
      .insert(adminUsers)
      .values({
        name: body.name,
        email: body.email,
        password_hash: passwordHash,
        role: body.role,
        email_verified: true,
        is_active: true,
      })
      .returning({
        id: adminUsers.id,
        name: adminUsers.name,
        email: adminUsers.email,
        role: adminUsers.role,
        created_at: adminUsers.created_at,
      });

    auditLog({
      event: "user_created",
      actor: session.user?.email ?? "unknown",
      detail: { email: body.email, role: body.role },
    });

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return jsonError("A user with that email already exists", 409, "DUPLICATE_EMAIL");
    }
    console.error("User creation failed:", err);
    return jsonError("Failed to create user", 500, "USER_CREATE_FAILED");
  }
}
