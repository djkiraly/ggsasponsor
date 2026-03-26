export const dynamic = "force-dynamic";

import { requireDb } from "@/lib/db";
import { settings } from "@/db/schema";
import { SettingsForm } from "@/components/admin/SettingsForm";

const SENSITIVE_KEYS = new Set([
  "gcs_private_key",
  "gmail_client_secret",
  "gmail_refresh_token",
  "stripe_secret_key",
  "stripe_webhook_secret",
]);
const MASK = "********";

export default async function AdminSettingsPage() {
  const db = requireDb();
  const rows = await db.select().from(settings);

  const current: Record<string, string> = {};
  for (const row of rows) {
    current[row.key] = SENSITIVE_KEYS.has(row.key) && row.value ? MASK : row.value;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage organization details, pricing, and integrations.
        </p>
      </div>
      <SettingsForm initial={current} />
    </div>
  );
}
