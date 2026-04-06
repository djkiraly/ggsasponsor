export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireAdminRole } from "@/auth";
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
  const session = await requireAdminRole();
  if (!session) redirect("/admin");
  const db = requireDb();
  const rows = await db.select().from(settings);

  const current: Record<string, string> = {};
  for (const row of rows) {
    current[row.key] = SENSITIVE_KEYS.has(row.key) && row.value ? MASK : row.value;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "#1C3FCF" }}>Settings</h1>
        <p className="mt-2 text-slate-700">
          Manage organization details, pricing, and integrations.
        </p>
      </div>
      <SettingsForm initial={current} />
    </div>
  );
}
