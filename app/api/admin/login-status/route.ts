import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { jsonError, getClientIp } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireDb } from "@/lib/db";
import { adminUsers } from "@/db/schema";

const BodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `login-status:${ip}`, windowMs: 60_000, max: 10 });
  if (!rl.allowed) return jsonError("Too many requests", 429, "RATE_LIMITED");

  try {
    const body = BodySchema.parse(await req.json());
    const db = requireDb();

    const rows = await db
      .select({
        email_verified: adminUsers.email_verified,
        is_active: adminUsers.is_active,
      })
      .from(adminUsers)
      .where(eq(adminUsers.email, body.email));

    if (rows.length === 0) {
      return NextResponse.json({ exists: false, email_verified: false, is_active: false });
    }

    return NextResponse.json({
      exists: true,
      email_verified: rows[0].email_verified,
      is_active: rows[0].is_active,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ exists: false, email_verified: false, is_active: false });
    }
    console.error("Login status check failed:", err);
    return jsonError("Check failed", 500, "LOGIN_STATUS_FAILED");
  }
}
