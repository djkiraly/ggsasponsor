import { NextResponse } from "next/server";
import { z } from "zod";

import { requireDb } from "@/lib/db";
import { jsonError, getClientIp } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { sponsorships, settings } from "@/db/schema";
import { buildReceiptEmail, sendEmail, escapeHtml } from "@/lib/email";
import { CreateCheckSponsorshipBodySchema } from "@/lib/validations";

function getAdminUrl() {
  const base = process.env.NEXTAUTH_URL;
  if (!base) return "/admin";
  return `${base.replace(/\/$/, "")}/admin`;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `sponsorships:${ip}`, windowMs: 60_000, max: 10 });
  if (!rl.allowed) return jsonError("Too many requests", 429, "RATE_LIMITED");

  try {
    const db = requireDb();
    const body = CreateCheckSponsorshipBodySchema.parse(await req.json());

    const inserted = await db
      .insert(sponsorships)
      .values({
        name: body.name,
        company: body.company ?? null,
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        email: body.email,
        phone: body.phone,
        sponsorship_type: body.sponsorshipType,
        amount_paid_cents: body.amountCents,

        jersey_color_primary: body.jerseyColorPrimary ?? null,
        jersey_color_secondary: body.jerseyColorSecondary ?? null,

        logo_gcs_url: body.logoGcsUrl ?? null,
        banner_gcs_url: body.bannerGcsUrl ?? null,

        stripe_payment_intent_id: null,
        stripe_payment_status: "pending",
        payment_method_type: "check",
        check_received_by: body.checkReceivedBy,

        status: "pending",
      })
      .returning({ id: sponsorships.id });

    const id = inserted[0]?.id;
    if (!id) return jsonError("Failed to save sponsorship", 500, "SAVE_FAILED");

    // Load settings for emails
    const settingRows = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    for (const row of settingRows) settingsMap[row.key] = row.value;

    // Receipt email to applicant
    const receiptHtml = buildReceiptEmail(
      {
        name: body.name,
        sponsorship_type: body.sponsorshipType,
        amount_paid_cents: body.amountCents,
        payment_method_type: "check",
        created_at: new Date(),
        company: body.company,
        email: body.email,
      },
      settingsMap
    );

    try {
      await sendEmail({
        to: body.email,
        subject: "GGSA Sponsorship Confirmation - Check Payment",
        html: receiptHtml,
      });
    } catch (err) {
      console.error("Failed to send receipt email:", err);
    }

    // Admin notification
    const adminTo = settingsMap["contact_email"];
    if (adminTo) {
      const amountUsd = (body.amountCents / 100).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });

      const adminHtml = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;color:#111827;">
      <div style="background:#1C3FCF;color:#ffffff;padding:14px 16px;border-radius:8px 8px 0 0;">
        <strong>New Sponsorship — Check Payment</strong>
      </div>
      <div style="border:1px solid #E2E8F0;border-top:none;padding:16px;">
        <div><strong>Applicant:</strong> ${escapeHtml(body.name)}${body.company ? ` (${escapeHtml(body.company)})` : ""}</div>
        <div style="margin-top:8px;"><strong>Sponsorship:</strong> ${escapeHtml(body.sponsorshipType)} (${escapeHtml(amountUsd)})</div>
        <div style="margin-top:8px;"><strong>Check received by:</strong> ${escapeHtml(body.checkReceivedBy)}</div>
        <div style="margin-top:8px;color:#D97706;"><strong>Status:</strong> Pending — check has not posted yet</div>
        <div style="margin-top:16px;"><a href="${escapeHtml(getAdminUrl())}" style="color:#1C3FCF;">Open admin dashboard</a></div>
      </div>
      <div style="margin-top:16px;font-size:12px;color:#6b7280;">GGSA Sponsorship Portal</div>
    </div>
  </body>
</html>`;

      try {
        await sendEmail({
          to: adminTo,
          subject: "GGSA: New Check Sponsorship - Pending",
          html: adminHtml,
        });
      } catch (err) {
        console.error("Failed to send admin notification:", err);
      }
    }

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error("Check sponsorship creation failed:", err);
    return NextResponse.json({ error: "Failed to process sponsorship", code: "SPONSORSHIP_CREATE_FAILED" }, { status: 400 });
  }
}
