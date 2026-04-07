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

/** RFC 2047 encode a header value if it contains non-ASCII characters. */
function encodeSubject(value: string): string {
  const sanitized = sanitizeHeader(value);
  // Only ASCII — no encoding needed
  if (/^[\x20-\x7E]*$/.test(sanitized)) return sanitized;
  const encoded = Buffer.from(sanitized, "utf-8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}

export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  const config = await getGmailConfig();
  if (!config) throw new Error("Gmail API is not configured.");

  // Use contact_email as Reply-To so replies reach the org, not the service account
  let replyTo: string | null = null;
  try {
    const s = await getSettings();
    if (s.contact_email) replyTo = s.contact_email;
  } catch {
    // Settings unavailable — skip Reply-To
  }

  const oauth2Client = new google.auth.OAuth2(config.clientId, config.clientSecret);
  oauth2Client.setCredentials({ refresh_token: config.refreshToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const headers = [
    `From: ${sanitizeHeader(config.fromAddress)}`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: ${encodeSubject(subject)}`,
    ...(replyTo ? [`Reply-To: ${sanitizeHeader(replyTo)}`] : []),
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    html,
  ];
  const rawMessage = headers.join("\n");

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
  payment_method_type?: "card" | "us_bank_account" | "check";
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
    sponsorship.payment_method_type === "check"
      ? "Check"
      : sponsorship.payment_method_type === "us_bank_account"
        ? "ACH"
        : "Credit Card";

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

export function buildVerificationEmail(
  name: string,
  verifyUrl: string,
  settings: SettingsMap
) {
  const orgName = settings["org_name"] ?? "Gering Girls Softball Association";
  const contactEmail = settings["contact_email"] ?? "info@geringgirlssoftball.org";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;border-collapse:collapse;">
            <tr>
              <td style="background:#1C3FCF;padding:20px 16px;color:#ffffff;">
                <div style="font-size:18px;font-weight:700;line-height:1.2;">${escapeHtml(orgName)}</div>
                <div style="font-size:14px;opacity:0.95;margin-top:4px;">Verify Your Email Address</div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 16px;color:#1f2937;">
                <div style="font-size:16px;line-height:1.6;">Hi ${escapeHtml(name)},</div>
                <div style="height:10px;"></div>
                <div style="font-size:14px;line-height:1.6;">
                  Thank you for registering. Please click the button below to verify your email address and complete your registration.
                </div>
                <div style="height:20px;"></div>
                <div style="text-align:center;">
                  <a href="${escapeHtml(verifyUrl)}" style="display:inline-block;background:#1C3FCF;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Verify Email Address</a>
                </div>
                <div style="height:20px;"></div>
                <div style="font-size:13px;line-height:1.6;color:#6b7280;">
                  This link expires in 24 hours. If you did not create an account, you can safely ignore this email.
                </div>
                <div style="height:10px;"></div>
                <div style="font-size:12px;line-height:1.6;color:#9ca3af;word-break:break-all;">
                  If the button above doesn&rsquo;t work, copy and paste this URL into your browser: ${escapeHtml(verifyUrl)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#1C3FCF;padding:14px 16px;color:#ffffff;font-size:12px;">
                ${escapeHtml(orgName)} &bull; ${escapeHtml(contactEmail)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildAdminNewUserNotification(
  userName: string,
  userEmail: string,
  adminUrl: string,
  settings: SettingsMap
) {
  const orgName = settings["org_name"] ?? "Gering Girls Softball Association";
  const contactEmail = settings["contact_email"] ?? "info@geringgirlssoftball.org";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;border-collapse:collapse;">
            <tr>
              <td style="background:#1C3FCF;padding:20px 16px;color:#ffffff;">
                <div style="font-size:18px;font-weight:700;line-height:1.2;">${escapeHtml(orgName)}</div>
                <div style="font-size:14px;opacity:0.95;margin-top:4px;">New User Registration</div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 16px;color:#1f2937;">
                <div style="font-size:14px;line-height:1.6;">
                  A new user has registered and verified their email address. Please review and activate their account.
                </div>
                <div style="height:16px;"></div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
                  <tr>
                    <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111827;font-weight:600;">Name</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#111827;">${escapeHtml(userName)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;font-size:13px;color:#111827;font-weight:600;">Email</td>
                    <td style="padding:10px 12px;font-size:13px;color:#111827;">${escapeHtml(userEmail)}</td>
                  </tr>
                </table>
                <div style="height:20px;"></div>
                <div style="text-align:center;">
                  <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#1C3FCF;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Review Users</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#1C3FCF;padding:14px 16px;color:#ffffff;font-size:12px;">
                ${escapeHtml(orgName)} &bull; ${escapeHtml(contactEmail)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildAccountActivatedEmail(
  name: string,
  loginUrl: string,
  settings: SettingsMap
) {
  const orgName = settings["org_name"] ?? "Gering Girls Softball Association";
  const contactEmail = settings["contact_email"] ?? "info@geringgirlssoftball.org";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;border-collapse:collapse;">
            <tr>
              <td style="background:#1C3FCF;padding:20px 16px;color:#ffffff;">
                <div style="font-size:18px;font-weight:700;line-height:1.2;">${escapeHtml(orgName)}</div>
                <div style="font-size:14px;opacity:0.95;margin-top:4px;">Account Activated</div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 16px;color:#1f2937;">
                <div style="font-size:16px;line-height:1.6;">Hi ${escapeHtml(name)},</div>
                <div style="height:10px;"></div>
                <div style="font-size:14px;line-height:1.6;">
                  Your account has been activated by an administrator. You can now sign in to access the sponsorship portal.
                </div>
                <div style="height:20px;"></div>
                <div style="text-align:center;">
                  <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#1C3FCF;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Sign In</a>
                </div>
                <div style="height:16px;"></div>
                <div style="font-size:13px;line-height:1.6;color:#111827;">
                  If you have any questions, please reach out to ${escapeHtml(contactEmail)}.
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#1C3FCF;padding:14px 16px;color:#ffffff;font-size:12px;">
                ${escapeHtml(orgName)} &bull; ${escapeHtml(contactEmail)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
