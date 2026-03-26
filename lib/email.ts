import { google } from "googleapis";
import { getSettings } from "@/lib/settings";

type GmailConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fromAddress: string;
};

/**
 * Resolve Gmail config from DB settings (preferred) with env var fallback.
 */
async function getGmailConfig(): Promise<GmailConfig | null> {
  let s: Record<string, string> = {};
  try {
    s = await getSettings();
  } catch {
    // DB not available — fall through to env vars only
  }

  const clientId = s.gmail_client_id || process.env.GMAIL_CLIENT_ID;
  const clientSecret = s.gmail_client_secret || process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = s.gmail_refresh_token || process.env.GMAIL_REFRESH_TOKEN;
  const fromAddress = s.gmail_from_address || process.env.GMAIL_FROM_ADDRESS;

  if (!clientId || !clientSecret || !refreshToken || !fromAddress) return null;
  return { clientId, clientSecret, refreshToken, fromAddress };
}

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
};

/** Strip CR/LF to prevent email header injection. */
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, "");
}

export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  const config = await getGmailConfig();
  if (!config) throw new Error("Gmail API is not configured.");

  const oauth2Client = new google.auth.OAuth2(config.clientId, config.clientSecret);
  oauth2Client.setCredentials({ refresh_token: config.refreshToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const rawMessage = [
    `From: ${sanitizeHeader(config.fromAddress)}`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: ${sanitizeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    html,
  ].join("\n");

  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });
}

function formatUsdFromCents(cents: number) {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

type ReceiptSponsorship = {
  name: string;
  sponsorship_type: "team" | "banner" | "both";
  amount_paid_cents: number;
  payment_method_type?: "card" | "us_bank_account";
  created_at?: Date | string | null;
  company?: string | null;
  email: string;
};

type SettingsMap = Record<string, string>;

export function buildReceiptEmail(
  sponsorship: ReceiptSponsorship,
  settings: SettingsMap
) {
  const orgName = settings["org_name"] ?? "Gering Girls Softball Association";
  const contactEmail = settings["contact_email"] ?? "info@geringgirlssoftball.org";
  const website = settings["website"] ?? "https://geringgirlssoftball.org";
  const seasonYear = settings["season_year"] ?? "";

  const sponsorshipLabel =
    sponsorship.sponsorship_type === "team"
      ? "Team"
      : sponsorship.sponsorship_type === "banner"
        ? "Banner"
        : "Team + Banner";

  const paymentMethodLabel =
    sponsorship.payment_method_type === "us_bank_account" ? "ACH" : "Credit Card";

  const date = sponsorship.created_at ? new Date(sponsorship.created_at) : new Date();
  const submissionDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const amountPaid = formatUsdFromCents(sponsorship.amount_paid_cents);

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;border-collapse:collapse;">
            <tr>
              <td style="background:#1C3FCF;padding:20px 16px;color:#ffffff;">
                <div style="font-size:18px;font-weight:700;line-height:1.2;">${orgName}</div>
                <div style="font-size:14px;opacity:0.95;margin-top:4px;">Sponsorship Confirmation</div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 16px;color:#1f2937;">
                <div style="font-size:16px;line-height:1.6;">Dear ${escapeHtml(sponsorship.name)},</div>
                <div style="height:10px;"></div>
                <div style="font-size:14px;line-height:1.6;">
                  Thank you for your sponsorship!
                  Your sponsorship helps support the girls of Gering's softball program.
                  We will be in touch with next steps.
                </div>
                <div style="height:18px;"></div>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
                  <tr>
                    <th align="left" style="background:#F8FAFF;padding:10px 12px;border-bottom:1px solid #E2E8F0;color:#1C3FCF;font-size:13px;">Field</th>
                    <th align="left" style="background:#F8FAFF;padding:10px 12px;border-bottom:1px solid #E2E8F0;color:#1C3FCF;font-size:13px;">Value</th>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111827;">Sponsorship Type</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111827;">${sponsorshipLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111827;">Amount Paid</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111827;">${amountPaid}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111827;">Payment Method</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111827;">${paymentMethodLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;font-size:13px;color:#111827;">Submission Date</td>
                    <td style="padding:10px 12px;font-size:13px;color:#111827;">${submissionDate}</td>
                  </tr>
                </table>

                <div style="height:16px;"></div>
                <div style="font-size:13px;line-height:1.6;color:#111827;">
                  If you have any questions, please reach out to ${contactEmail}.
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#1C3FCF;padding:14px 16px;color:#ffffff;font-size:12px;">
                ${escapeHtml(orgName)} &bull; ${escapeHtml(contactEmail)} &bull; ${escapeHtml(website)}${seasonYear ? ` &bull; Season ${escapeHtml(seasonYear)}` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
