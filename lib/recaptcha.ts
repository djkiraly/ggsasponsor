import { getSettings } from "@/lib/settings";

/**
 * Verify a reCAPTCHA v3 token server-side.
 * Returns true if reCAPTCHA is disabled or verification passes.
 * Returns false if verification fails.
 */
export async function verifyRecaptcha(token: string | undefined): Promise<boolean> {
  const settings = await getSettings();

  // If reCAPTCHA is not enabled, skip verification
  if (settings.recaptcha_enabled !== "true") return true;

  const secretKey = settings.recaptcha_secret_key;
  if (!secretKey) return true; // Not configured — skip

  if (!token) return false; // Enabled but no token provided

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });

    const data = await res.json();

    // reCAPTCHA v3 returns a score from 0.0 to 1.0
    // 0.5 is Google's recommended threshold
    return data.success === true && (data.score ?? 0) >= 0.5;
  } catch (err) {
    console.error("reCAPTCHA verification failed:", err);
    // Fail open — don't block users if Google is unreachable
    return true;
  }
}
