import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { jsonError } from "@/lib/api";
import { requireDb } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { adminUsers, settings } from "@/db/schema";
import { sendEmail, buildAdminNewUserNotification } from "@/lib/email";

function getBaseUrl() {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token || token.length < 32) {
      return jsonError("Invalid verification link.", 400, "INVALID_TOKEN");
    }

    const db = requireDb();

    const rows = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.verification_token, token));

    const user = rows[0];
    if (!user) {
      return jsonError("Invalid verification link.", 400, "INVALID_TOKEN");
    }

    if (user.email_verified) {
      return jsonError("Email already verified.", 400, "ALREADY_VERIFIED");
    }

    if (user.verification_token_expires_at && user.verification_token_expires_at < new Date()) {
      return jsonError("This verification link has expired. Please register again.", 400, "TOKEN_EXPIRED");
    }

    // Mark as verified and clear token
    await db
      .update(adminUsers)
      .set({
        email_verified: true,
        verification_token: null,
        verification_token_expires_at: null,
      })
      .where(eq(adminUsers.id, user.id));

    auditLog({
      event: "user_email_verified",
      actor: user.email,
      detail: { userId: user.id },
    });

    // Notify all admins
    try {
      const admins = await db
        .select({ email: adminUsers.email })
        .from(adminUsers)
        .where(eq(adminUsers.role, "admin"));

      const settingRows = await db.select().from(settings);
      const settingsMap: Record<string, string> = {};
      for (const row of settingRows) settingsMap[row.key] = row.value;

      const adminUrl = `${getBaseUrl()}/admin/users`;
      const notificationHtml = buildAdminNewUserNotification(
        user.name,
        user.email,
        adminUrl,
        settingsMap
      );

      for (const admin of admins) {
        try {
          await sendEmail({
            to: admin.email,
            subject: "GGSA: New User Pending Activation",
            html: notificationHtml,
          });
        } catch (err) {
          console.error(`Failed to notify admin ${admin.email}:`, err);
        }
      }
    } catch (err) {
      console.error("Failed to send admin notifications:", err);
    }

    return NextResponse.json({ success: true, email: user.email });
  } catch (err) {
    console.error("Email verification failed:", err);
    return jsonError("Verification failed. Please try again.", 500, "VERIFY_FAILED");
  }
}
