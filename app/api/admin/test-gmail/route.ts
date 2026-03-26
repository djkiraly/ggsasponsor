import { NextResponse } from "next/server";
import { google } from "googleapis";

import { getAdminServerSession } from "@/auth";
import { jsonError } from "@/lib/api";
import { getSettings } from "@/lib/settings";

export async function POST() {
  try {
    const session = await getAdminServerSession();
    if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");

    const s = await getSettings();
    const clientId = s.gmail_client_id || process.env.GMAIL_CLIENT_ID;
    const clientSecret = s.gmail_client_secret || process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = s.gmail_refresh_token || process.env.GMAIL_REFRESH_TOKEN;
    const fromAddress = s.gmail_from_address || process.env.GMAIL_FROM_ADDRESS;

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json({
        success: false,
        error: "Gmail configuration is incomplete. Please fill in all fields.",
      });
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });

    return NextResponse.json({
      success: true,
      email: profile.data.emailAddress,
      fromAddress: fromAddress || "(not set)",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message });
  }
}
