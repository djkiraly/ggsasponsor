import { NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";

import { getAdminServerSession } from "@/auth";
import { jsonError } from "@/lib/api";
import { requireDb } from "@/lib/db";
import { sponsorships, settings } from "@/db/schema";
import { sendEmail, escapeHtml } from "@/lib/email";

const BodySchema = z.object({
  email: z.string().email(),
});

function formatUsd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const TYPE_LABEL: Record<string, string> = {
  team: "Team",
  banner: "Banner",
  both: "Both",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#D97706",
  approved: "#16A34A",
  rejected: "#DC2626",
};

export async function POST(req: Request) {
  try {
    const session = await getAdminServerSession();
    if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");

    const body = BodySchema.parse(await req.json());
    const db = requireDb();

    const items = await db
      .select()
      .from(sponsorships)
      .orderBy(desc(sponsorships.created_at));

    const settingRows = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    for (const row of settingRows) settingsMap[row.key] = row.value;

    const orgName = settingsMap.org_name ?? "Gering Girls Softball Association";
    const now = new Date().toLocaleString("en-US", {
      year: "numeric", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });

    const totalRevenue = items
      .filter((i) => i.stripe_payment_status === "succeeded")
      .reduce((sum, i) => sum + i.amount_paid_cents, 0);

    const rows = items.map((item) => {
      const statusColor = STATUS_COLORS[item.status] ?? "#6B7280";
      const date = new Date(item.created_at).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      });
      const paymentType =
        item.payment_method_type === "check" ? "Check"
        : item.payment_method_type === "us_bank_account" ? "ACH"
        : "Card";

      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111827;">${escapeHtml(item.name)}${item.company ? `<br/><span style="color:#6B7280;font-size:11px;">${escapeHtml(item.company)}</span>` : ""}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111827;">${escapeHtml(item.email)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111827;">${escapeHtml(TYPE_LABEL[item.sponsorship_type] ?? item.sponsorship_type)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111827;">${formatUsd(item.amount_paid_cents)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111827;">${escapeHtml(paymentType)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;"><span style="color:${statusColor};font-weight:600;">${escapeHtml(item.status.charAt(0).toUpperCase() + item.status.slice(1))}</span></td>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#6B7280;">${date}</td>
      </tr>`;
    }).join("");

    const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="800" cellspacing="0" cellpadding="0" style="max-width:800px;width:100%;border-collapse:collapse;">
            <tr>
              <td style="background:#1C3FCF;padding:20px 16px;color:#ffffff;">
                <div style="font-size:18px;font-weight:700;line-height:1.2;">${escapeHtml(orgName)}</div>
                <div style="font-size:14px;opacity:0.95;margin-top:4px;">Sponsorship Submissions Report</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px;">
                <div style="font-size:13px;color:#6B7280;margin-bottom:12px;">
                  Generated: ${escapeHtml(now)} &bull; ${items.length} submission${items.length !== 1 ? "s" : ""} &bull; Total revenue: ${formatUsd(totalRevenue)}
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;border-collapse:collapse;">
                  <tr style="background:#F8FAFF;">
                    <th style="padding:10px;border-bottom:1px solid #E2E8F0;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#1C3FCF;text-align:left;">Sponsor</th>
                    <th style="padding:10px;border-bottom:1px solid #E2E8F0;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#1C3FCF;text-align:left;">Email</th>
                    <th style="padding:10px;border-bottom:1px solid #E2E8F0;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#1C3FCF;text-align:left;">Type</th>
                    <th style="padding:10px;border-bottom:1px solid #E2E8F0;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#1C3FCF;text-align:left;">Amount</th>
                    <th style="padding:10px;border-bottom:1px solid #E2E8F0;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#1C3FCF;text-align:left;">Payment</th>
                    <th style="padding:10px;border-bottom:1px solid #E2E8F0;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#1C3FCF;text-align:left;">Status</th>
                    <th style="padding:10px;border-bottom:1px solid #E2E8F0;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#1C3FCF;text-align:left;">Date</th>
                  </tr>
                  ${rows || '<tr><td colspan="7" style="padding:20px;text-align:center;color:#6B7280;font-size:13px;">No submissions found.</td></tr>'}
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#1C3FCF;padding:14px 16px;color:#ffffff;font-size:12px;">
                ${escapeHtml(orgName)} &bull; Sponsorship Portal
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    await sendEmail({
      to: body.email,
      subject: `${orgName} - Sponsorship Report (${items.length} submissions)`,
      html,
    });

    return NextResponse.json({ success: true, count: items.length });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email address", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error("Report generation failed:", err);
    return jsonError("Failed to generate report", 500, "REPORT_FAILED");
  }
}
