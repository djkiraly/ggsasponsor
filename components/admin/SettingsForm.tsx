"use client";

import { useState, useRef, type ChangeEvent } from "react";

type Tab = "general" | "stripe" | "gcs" | "gmail";

const TABS: { key: Tab; label: string }[] = [
  { key: "general", label: "General" },
  { key: "stripe", label: "Payments (Stripe)" },
  { key: "gcs", label: "Cloud Storage" },
  { key: "gmail", label: "Email (Gmail)" },
];

const MASK = "********";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#1C3FCF] focus:ring-2 focus:ring-[#1C3FCF]/20";
const labelCls = "mb-1.5 block text-sm font-semibold text-slate-800";
const cardCls = "rounded-xl border border-slate-200 bg-white p-6 shadow-sm";
const btnCls =
  "rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60";

type TestStatus = { state: "idle" | "loading" | "success" | "error"; message?: string };

export function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [tab, setTab] = useState<Tab>("general");
  const [values, setValues] = useState<Record<string, string>>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [stripeTest, setStripeTest] = useState<TestStatus>({ state: "idle" });
  const [gcsTest, setGcsTest] = useState<TestStatus>({ state: "idle" });
  const [gmailTest, setGmailTest] = useState<TestStatus>({ state: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  function set(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function save(keys: string[]) {
    setSaving(true);
    setSaveMsg(null);
    const updates: Record<string, string> = {};
    for (const k of keys) {
      if (values[k] !== undefined) updates[k] = values[k];
    }
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveMsg(`Error: ${data.error || "Save failed"}`);
      } else {
        setSaveMsg("Saved successfully.");
      }
    } catch {
      setSaveMsg("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadGcsKey(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/admin/upload-gcs-key", { method: "POST", body: form });
      const data = await res.json();
      if (data.success) {
        set("gcs_project_id", data.projectId);
        set("gcs_client_email", data.clientEmail);
        set("gcs_private_key", MASK);
        setSaveMsg("Key file uploaded. Project ID and email populated.");
      } else {
        setSaveMsg(`Error: ${data.error}`);
      }
    } catch {
      setSaveMsg("Upload failed.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function testGcs() {
    setGcsTest({ state: "loading" });
    try {
      const res = await fetch("/api/admin/test-gcs", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setGcsTest({ state: "success", message: "Connection successful. Bucket accessible." });
      } else {
        setGcsTest({ state: "error", message: data.error });
      }
    } catch {
      setGcsTest({ state: "error", message: "Network error." });
    }
  }

  async function testStripe() {
    setStripeTest({ state: "loading" });
    try {
      const res = await fetch("/api/admin/test-stripe", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStripeTest({
          state: "success",
          message: `Connected to account ${data.accountId}. Publishable key: ${data.publishableKeySet ? "set" : "missing"}.`,
        });
      } else {
        setStripeTest({ state: "error", message: data.error });
      }
    } catch {
      setStripeTest({ state: "error", message: "Network error." });
    }
  }

  async function testGmail() {
    setGmailTest({ state: "loading" });
    try {
      const res = await fetch("/api/admin/test-gmail", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setGmailTest({
          state: "success",
          message: `Authenticated as ${data.email}. From address: ${data.fromAddress}`,
        });
      } else {
        setGmailTest({ state: "error", message: data.error });
      }
    } catch {
      setGmailTest({ state: "error", message: "Network error." });
    }
  }

  const generalKeys = [
    "org_name", "contact_email", "website", "season_year",
    "price_team_cents", "price_banner_cents", "price_both_cents",
  ];
  const stripeKeys = ["stripe_secret_key", "stripe_publishable_key", "stripe_webhook_secret"];
  const gcsKeys = ["gcs_bucket_name", "gcs_project_id", "gcs_client_email", "gcs_private_key"];
  const gmailKeys = ["gmail_client_id", "gmail_client_secret", "gmail_refresh_token", "gmail_from_address"];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setSaveMsg(null); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-[#1C3FCF] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Save message */}
      {saveMsg && (
        <div
          className={`mt-4 rounded-md px-4 py-2 text-sm ${
            saveMsg.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
        >
          {saveMsg}
        </div>
      )}

      {/* General Tab */}
      {tab === "general" && (
        <div className={`mt-4 ${cardCls}`}>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Organization &amp; Pricing</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organization Name" value={values.org_name} onChange={(v) => set("org_name", v)} />
            <Field label="Contact Email" value={values.contact_email} onChange={(v) => set("contact_email", v)} type="email" />
            <Field label="Website" value={values.website} onChange={(v) => set("website", v)} type="url" />
            <Field label="Season Year" value={values.season_year} onChange={(v) => set("season_year", v)} />
            <Field label="Team Sponsorship Price (cents)" value={values.price_team_cents} onChange={(v) => set("price_team_cents", v)} type="number" />
            <Field label="Banner Sponsorship Price (cents)" value={values.price_banner_cents} onChange={(v) => set("price_banner_cents", v)} type="number" />
            <Field label="Both Sponsorship Price (cents)" value={values.price_both_cents} onChange={(v) => set("price_both_cents", v)} type="number" />
          </div>
          <div className="mt-6">
            <button
              type="button"
              disabled={saving}
              onClick={() => save(generalKeys)}
              className={btnCls}
              style={{ background: "#1C3FCF" }}
            >
              {saving ? "Saving..." : "Save General Settings"}
            </button>
          </div>
        </div>
      )}

      {/* Stripe Tab */}
      {tab === "stripe" && (
        <div className={`mt-4 ${cardCls}`}>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Stripe Configuration</h2>

          {/* Instructions */}
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">How to get your Stripe keys:</p>
            <ol className="mt-2 list-inside list-decimal space-y-1.5">
              <li>Log in to your <span className="font-medium">Stripe Dashboard</span> at dashboard.stripe.com</li>
              <li>Navigate to <span className="font-medium">Developers &rarr; API keys</span></li>
              <li>Copy the <span className="font-medium">Publishable key</span> (starts with <code className="rounded bg-slate-200 px-1 text-xs">pk_</code>) and <span className="font-medium">Secret key</span> (starts with <code className="rounded bg-slate-200 px-1 text-xs">sk_</code>)</li>
              <li>For the webhook secret: go to <span className="font-medium">Developers &rarr; Webhooks &rarr; Add endpoint</span></li>
              <li>Set the endpoint URL to <code className="rounded bg-slate-200 px-1 text-xs">https://yourdomain.com/api/stripe-webhook</code></li>
              <li>Select events: <code className="rounded bg-slate-200 px-1 text-xs">payment_intent.succeeded</code> and <code className="rounded bg-slate-200 px-1 text-xs">payment_intent.payment_failed</code></li>
              <li>Copy the <span className="font-medium">Signing secret</span> (starts with <code className="rounded bg-slate-200 px-1 text-xs">whsec_</code>)</li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              Use test keys (<code className="rounded bg-slate-200 px-1">pk_test_</code> / <code className="rounded bg-slate-200 px-1">sk_test_</code>) for development. Switch to live keys for production.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SecretField label="Secret Key" value={values.stripe_secret_key} onChange={(v) => set("stripe_secret_key", v)} />
            <Field label="Publishable Key" value={values.stripe_publishable_key} onChange={(v) => set("stripe_publishable_key", v)} />
            <SecretField label="Webhook Secret" value={values.stripe_webhook_secret} onChange={(v) => set("stripe_webhook_secret", v)} />
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => save(stripeKeys)}
              className={btnCls}
              style={{ background: "#1C3FCF" }}
            >
              {saving ? "Saving..." : "Save Stripe Settings"}
            </button>
            <button
              type="button"
              disabled={stripeTest.state === "loading"}
              onClick={testStripe}
              className={`${btnCls} !bg-white !text-[#1C3FCF] border border-slate-300 !shadow-none hover:!bg-slate-50`}
            >
              {stripeTest.state === "loading" ? "Testing..." : "Test Connection"}
            </button>
          </div>
          <StatusBadge status={stripeTest} />
        </div>
      )}

      {/* GCS Tab */}
      {tab === "gcs" && (
        <div className={`mt-4 ${cardCls}`}>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Google Cloud Storage</h2>

          {/* JSON key upload */}
          <div className="mb-6 rounded-md border border-dashed border-[#E2E8F0] bg-[#F8FAFF] p-4">
            <p className="mb-2 text-sm text-slate-700">
              Upload a GCS service account JSON key file to auto-populate credentials:
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={uploadGcsKey}
              className="text-sm text-slate-700"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bucket Name" value={values.gcs_bucket_name} onChange={(v) => set("gcs_bucket_name", v)} />
            <Field label="Project ID" value={values.gcs_project_id} onChange={(v) => set("gcs_project_id", v)} />
            <Field label="Client Email" value={values.gcs_client_email} onChange={(v) => set("gcs_client_email", v)} />
          </div>
          <div className="mt-4">
            <label className={labelCls}>Private Key</label>
            <textarea
              rows={3}
              value={values.gcs_private_key ?? ""}
              onChange={(e) => set("gcs_private_key", e.target.value)}
              placeholder={values.gcs_private_key === MASK ? "(encrypted — leave blank to keep current)" : "Paste private key here"}
              className={inputCls + " font-mono text-xs"}
            />
            {values.gcs_private_key === MASK && (
              <p className="mt-1 text-xs text-slate-700">A private key is already stored (encrypted). Leave as-is to keep it.</p>
            )}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => save(gcsKeys)}
              className={btnCls}
              style={{ background: "#1C3FCF" }}
            >
              {saving ? "Saving..." : "Save GCS Settings"}
            </button>
            <button
              type="button"
              disabled={gcsTest.state === "loading"}
              onClick={testGcs}
              className={`${btnCls} !bg-white !text-[#1C3FCF] border border-slate-300 !shadow-none hover:!bg-slate-50`}
            >
              {gcsTest.state === "loading" ? "Testing..." : "Test Connection"}
            </button>
          </div>

          <StatusBadge status={gcsTest} />
        </div>
      )}

      {/* Gmail Tab */}
      {tab === "gmail" && (
        <div className={`mt-4 ${cardCls}`}>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Gmail API (OAuth2)</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client ID" value={values.gmail_client_id} onChange={(v) => set("gmail_client_id", v)} />
            <SecretField label="Client Secret" value={values.gmail_client_secret} onChange={(v) => set("gmail_client_secret", v)} />
            <SecretField label="Refresh Token" value={values.gmail_refresh_token} onChange={(v) => set("gmail_refresh_token", v)} />
            <Field label="From Address" value={values.gmail_from_address} onChange={(v) => set("gmail_from_address", v)} type="email" />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => save(gmailKeys)}
              className={btnCls}
              style={{ background: "#1C3FCF" }}
            >
              {saving ? "Saving..." : "Save Gmail Settings"}
            </button>
            <button
              type="button"
              disabled={gmailTest.state === "loading"}
              onClick={testGmail}
              className={`${btnCls} !bg-white !text-[#1C3FCF] border border-slate-300 !shadow-none hover:!bg-slate-50`}
            >
              {gmailTest.state === "loading" ? "Testing..." : "Test Connection"}
            </button>
          </div>

          <StatusBadge status={gmailTest} />
        </div>
      )}
    </div>
  );
}

/* ---- Helper components ---- */

function Field({
  label, value, onChange, type = "text",
}: {
  label: string; value: string | undefined; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}

function SecretField({
  label, value, onChange,
}: {
  label: string; value: string | undefined; onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const isMasked = value === MASK;

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex gap-1">
        <input
          type={visible ? "text" : "password"}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isMasked ? "(encrypted — leave blank to keep)" : ""}
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="rounded-md border border-[#E2E8F0] px-2 text-xs text-slate-700 hover:bg-slate-50"
          title={visible ? "Hide" : "Show"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {isMasked && (
        <p className="mt-1 text-xs text-slate-700">A value is already stored (encrypted). Leave as-is to keep it.</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TestStatus }) {
  if (status.state === "idle") return null;
  if (status.state === "loading") {
    return <p className="mt-3 text-sm text-slate-700">Testing connection...</p>;
  }
  const isOk = status.state === "success";
  return (
    <div
      className={`mt-3 rounded-md px-4 py-2 text-sm ${
        isOk ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      {isOk ? "OK" : "Failed"}: {status.message}
    </div>
  );
}
