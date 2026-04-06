import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { jsonError, getClientIp } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireDb } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { adminUsers, settings } from "@/db/schema";
import { sendEmail, buildVerificationEmail } from "@/lib/email";

const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function getBaseUrl() {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `register:${ip}`, windowMs: 3_600_000, max: 5 });
  if (!rl.allowed) return jsonError("Too many registration attempts. Please try again later.", 429, "RATE_LIMITED");

  try {
    const body = RegisterSchema.parse(await req.json());
    const db = requireDb();

    // Check for duplicate email
    const existing = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, body.email));
    if (existing.length > 0) {
      return jsonError("An account with that email already exists.", 409, "DUPLICATE_EMAIL");
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(adminUsers).values({
      name: body.name,
      email: body.email,
      password_hash: passwordHash,
      role: "user",
      email_verified: false,
      is_active: false,
      verification_token: token,
      verification_token_expires_at: expiresAt,
    });

    // Send verification email
    const verifyUrl = `${getBaseUrl()}/admin/verify-email?token=${token}`;
    const settingRows = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    for (const row of settingRows) settingsMap[row.key] = row.value;

    const html = buildVerificationEmail(body.name, verifyUrl, settingsMap);

    try {
      await sendEmail({
        to: body.email,
        subject: "Verify your email address",
        html,
      });
    } catch (err) {
      console.error("Failed to send verification email:", err);
      // Don't fail the registration — the user can request a resend later
    }

    auditLog({
      event: "user_self_registered",
      detail: { email: body.email },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error("Registration failed:", err);
    return jsonError("Registration failed. Please try again.", 500, "REGISTER_FAILED");
  }
}
