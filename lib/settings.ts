import { eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { settings } from "@/db/schema";

const SENSITIVE_KEYS = new Set([
  "gcs_private_key",
  "gmail_client_secret",
  "gmail_refresh_token",
  "stripe_secret_key",
  "stripe_webhook_secret",
  "recaptcha_secret_key",
]);

let cache: { data: Record<string, string>; ts: number } | null = null;
const TTL_MS = 60_000; // 60 seconds

/**
 * Read all settings from the database with decryption of sensitive values.
 * Cached for 60s to avoid repeated DB hits on every request.
 */
export async function getSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.data;

  const db = requireDb();
  const rows = await db.select().from(settings);

  const result: Record<string, string> = {};
  for (const row of rows) {
    if (SENSITIVE_KEYS.has(row.key) && row.value) {
      try {
        result[row.key] = decrypt(row.value);
      } catch {
        // Value might be plain text (legacy) or corrupt — return as-is
        result[row.key] = row.value;
      }
    } else {
      result[row.key] = row.value;
    }
  }

  cache = { data: result, ts: Date.now() };
  return result;
}

/** Read a single setting, with env var fallback. */
export async function getSetting(key: string, envFallback?: string): Promise<string | undefined> {
  const all = await getSettings();
  return all[key] || envFallback || undefined;
}

/** Invalidate the settings cache (call after PUT). */
export function invalidateSettingsCache() {
  cache = null;
}

/** Read a specific setting directly from DB (no cache), decrypting if sensitive. */
export async function getSettingDirect(key: string): Promise<string | undefined> {
  const db = requireDb();
  const rows = await db.select().from(settings).where(eq(settings.key, key));
  const row = rows[0];
  if (!row) return undefined;

  if (SENSITIVE_KEYS.has(key) && row.value) {
    try {
      return decrypt(row.value);
    } catch {
      return row.value;
    }
  }
  return row.value;
}
