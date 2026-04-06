"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

type Tab = "general" | "stripe" | "gcs" | "gmail" | "recaptcha";

const TABS: { key: Tab; label: string }[] = [
  { key: "general", label: "General" },
  { key: "stripe", label: "Payments (Stripe)" },
  { key: "gcs", label: "Cloud Storage" },
  { key: "gmail", label: "Email (Gmail)" },
  { key: "recaptcha", label: "Security" },
];

const MASK = "********";

const inputCls =
  "w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]";
const labelCls = "mb-1 block text-sm font-semibold text-slate-800";
const cardCls = "rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-6 shadow-sm";
const btnCls =
  "inline-flex items-center justify-center rounded-md px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-70";

type TestStatus = { state: "idle" | "loading" | "success" | "error"; message?: string };

export function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [tab, setTab] = useState<Tab>("general");
  const [values, setValues] = useState<Record<string, string>>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [stripeTest, setStripeTest] = useState<TestStatus>({ state: "idle" });
  const [gcsTest, setGcsTest] = useState<TestStatus>({ state: "idle" });
  const [gmailTest, setGmailTest] = useState<TestStatus>({ state: "idle" });
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMsg, setLogoMsg] = useState<string | null>(null);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [faviconMsg, setFaviconMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);

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

  async function uploadLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setLogoMsg(null);
    try {
      // Get a signed upload URL from the admin API
      const urlRes = await fetch("/api/admin/upload-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) {
        setLogoMsg(`Error: ${urlData.error || "Failed to get upload URL"}`);
        return;
      }

      // Upload the file directly to GCS
      const putRes = await fetch(urlData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        setLogoMsg("Error: File upload to storage failed.");
        return;
      }

      set("hero_logo_url", urlData.publicUrl);
      setLogoMsg("Logo uploaded successfully.");
    } catch {
      setLogoMsg("Error: Upload failed.");
    } finally {
      setLogoUploading(false);
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  }

  async function uploadFavicon(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconUploading(true);
    setFaviconMsg(null);
    try {
      const urlRes = await fetch("/api/admin/upload-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: `favicon-${file.name}`, contentType: file.type }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) {
        setFaviconMsg(`Error: ${urlData.error || "Failed to get upload URL"}`);
        return;
      }

      const putRes = await fetch(urlData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        setFaviconMsg("Error: File upload failed.");
        return;
      }

      set("favicon_url", urlData.publicUrl);
      // Save immediately
      const saveRes = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { favicon_url: urlData.publicUrl } }),
      });
      if (saveRes.ok) {
        setFaviconMsg("Favicon uploaded and saved.");
      } else {
        setFaviconMsg("Favicon uploaded. Click Save to apply.");
      }
    } catch {
      setFaviconMsg("Error: Upload failed.");
    } finally {
      setFaviconUploading(false);
      if (faviconFileRef.current) faviconFileRef.current.value = "";
    }
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
    "site_title", "site_description", "footer_text",
    "hero_heading", "hero_body",
  ];
  const stripeKeys = ["stripe_secret_key", "stripe_publishable_key", "stripe_webhook_secret"];
  const gcsKeys = ["gcs_bucket_name", "gcs_project_id", "gcs_client_email", "gcs_private_key"];
  const gmailKeys = ["gmail_client_id", "gmail_client_secret", "gmail_refresh_token", "gmail_from_address"];
  const recaptchaKeys = ["recaptcha_enabled", "recaptcha_site_key", "recaptcha_secret_key"];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-[#E2E8F0] bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setSaveMsg(null); }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-[#1C3FCF] text-white"
                : "text-slate-700 hover:bg-[#E2E8F0] hover:text-slate-900"
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
            <PriceField label="Team Sponsorship Price" centsValue={values.price_team_cents} onCentsChange={(v) => set("price_team_cents", v)} />
            <PriceField label="Banner Sponsorship Price" centsValue={values.price_banner_cents} onCentsChange={(v) => set("price_banner_cents", v)} />
            <PriceField label="Both Sponsorship Price" centsValue={values.price_both_cents} onCentsChange={(v) => set("price_both_cents", v)} />
          </div>

          <h2 className="mb-4 mt-6 text-lg font-semibold text-slate-800">Site &amp; SEO</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Site Title" value={values.site_title} onChange={(v) => set("site_title", v)} />
            <div className="sm:col-span-2">
              <label className={labelCls}>Site Description</label>
              <textarea
                rows={2}
                value={values.site_description ?? ""}
                onChange={(e) => set("site_description", e.target.value)}
                className={inputCls}
                placeholder="Shown in search engine results and browser tabs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Favicon</label>
              <div className="flex items-start gap-4">
                {values.favicon_url ? (
                  <img
                    src={values.favicon_url}
                    alt="Current favicon"
                    className="h-10 w-10 rounded border border-[#E2E8F0] bg-white object-contain p-0.5"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-[#E2E8F0] bg-white text-xs text-slate-500">
                    None
                  </div>
                )}
                <div>
                  <input
                    ref={faviconFileRef}
                    type="file"
                    accept="image/png,image/x-icon,image/svg+xml,image/vnd.microsoft.icon"
                    onChange={uploadFavicon}
                    disabled={faviconUploading}
                    className="text-sm text-slate-700"
                  />
                  <p className="mt-1 text-xs text-slate-500">PNG, ICO, or SVG. Recommended: 32x32 or 64x64 pixels.</p>
                  {faviconUploading && <p className="mt-1 text-xs text-slate-700">Uploading...</p>}
                  {faviconMsg && (
                    <p className={`mt-1 text-xs ${faviconMsg.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>
                      {faviconMsg}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <h2 className="mb-4 mt-6 text-lg font-semibold text-slate-800">Footer</h2>
          <div>
            <label className={labelCls}>Footer Text</label>
            <textarea
              rows={2}
              value={values.footer_text ?? ""}
              onChange={(e) => set("footer_text", e.target.value)}
              className={inputCls}
              placeholder="Custom text displayed in the footer of all public pages"
            />
          </div>

          <h2 className="mb-4 mt-6 text-lg font-semibold text-slate-800">Hero Section</h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Site Logo</label>
              <div className="flex items-start gap-4">
                {values.hero_logo_url ? (
                  <img
                    src={values.hero_logo_url}
                    alt="Current site logo"
                    className="h-20 w-20 rounded-lg border border-[#E2E8F0] object-contain bg-white p-1"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-[#E2E8F0] bg-white text-xs text-slate-500">
                    No logo
                  </div>
                )}
                <div>
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={uploadLogo}
                    disabled={logoUploading}
                    className="text-sm text-slate-700"
                  />
                  <p className="mt-1 text-xs text-slate-500">PNG, JPEG, SVG, or WebP. Displayed in the hero section on the public page.</p>
                  {logoUploading && <p className="mt-1 text-xs text-slate-700">Uploading...</p>}
                  {logoMsg && (
                    <p className={`mt-1 text-xs ${logoMsg.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>
                      {logoMsg}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className={labelCls}>Hero Heading</label>
              <RichTextEditor value={values.hero_heading ?? ""} onChange={(v) => set("hero_heading", v)} />
            </div>
            <div>
              <label className={labelCls}>Hero Body</label>
              <RichTextEditor value={values.hero_body ?? ""} onChange={(v) => set("hero_body", v)} />
            </div>
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
          <div className="mb-6 rounded-md border border-[#E2E8F0] bg-white p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">How to get your Stripe keys:</p>
            <ol className="mt-2 list-inside list-decimal space-y-1.5">
              <li>Log in to your <span className="font-medium">Stripe Dashboard</span> at dashboard.stripe.com</li>
              <li>Navigate to <span className="font-medium">Developers &rarr; API keys</span></li>
              <li>Copy the <span className="font-medium">Publishable key</span> (starts with <code className="rounded bg-[#E2E8F0] px-1 text-xs">pk_</code>) and <span className="font-medium">Secret key</span> (starts with <code className="rounded bg-[#E2E8F0] px-1 text-xs">sk_</code>)</li>
              <li>For the webhook secret: go to <span className="font-medium">Developers &rarr; Webhooks &rarr; Add endpoint</span></li>
              <li>Set the endpoint URL to <code className="rounded bg-[#E2E8F0] px-1 text-xs">https://yourdomain.com/api/stripe-webhook</code></li>
              <li>Select events: <code className="rounded bg-[#E2E8F0] px-1 text-xs">payment_intent.succeeded</code> and <code className="rounded bg-[#E2E8F0] px-1 text-xs">payment_intent.payment_failed</code></li>
              <li>Copy the <span className="font-medium">Signing secret</span> (starts with <code className="rounded bg-[#E2E8F0] px-1 text-xs">whsec_</code>)</li>
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
              className={`${btnCls} !bg-white !text-[#1C3FCF] border border-[#E2E8F0] hover:!bg-[#F8FAFF]`}
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
              className={`${btnCls} !bg-white !text-[#1C3FCF] border border-[#E2E8F0] hover:!bg-[#F8FAFF]`}
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
              className={`${btnCls} !bg-white !text-[#1C3FCF] border border-[#E2E8F0] hover:!bg-[#F8FAFF]`}
            >
              {gmailTest.state === "loading" ? "Testing..." : "Test Connection"}
            </button>
          </div>

          <StatusBadge status={gmailTest} />
        </div>
      )}

      {/* reCAPTCHA Tab */}
      {tab === "recaptcha" && (
        <div className={`mt-4 ${cardCls}`}>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Google reCAPTCHA v3</h2>

          <div className="mb-6 rounded-md border border-[#E2E8F0] bg-white p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">How to set up reCAPTCHA:</p>
            <ol className="mt-2 list-inside list-decimal space-y-1.5">
              <li>Go to the <span className="font-medium">Google reCAPTCHA Admin Console</span></li>
              <li>Register a new site and select <span className="font-medium">reCAPTCHA v3</span></li>
              <li>Add your domain(s) to the allowed list</li>
              <li>Copy the <span className="font-medium">Site Key</span> and <span className="font-medium">Secret Key</span></li>
            </ol>
          </div>

          <div className="mb-4">
            <label className={labelCls}>Enable reCAPTCHA</label>
            <button
              type="button"
              onClick={() => set("recaptcha_enabled", values.recaptcha_enabled === "true" ? "false" : "true")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                values.recaptcha_enabled === "true" ? "bg-[#1C3FCF]" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  values.recaptcha_enabled === "true" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="ml-3 text-sm text-slate-700">
              {values.recaptcha_enabled === "true" ? "Enabled" : "Disabled"}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Site Key" value={values.recaptcha_site_key} onChange={(v) => set("recaptcha_site_key", v)} />
            <SecretField label="Secret Key" value={values.recaptcha_secret_key} onChange={(v) => set("recaptcha_secret_key", v)} />
          </div>

          <div className="mt-6">
            <button
              type="button"
              disabled={saving}
              onClick={() => save(recaptchaKeys)}
              className={btnCls}
              style={{ background: "#1C3FCF" }}
            >
              {saving ? "Saving..." : "Save reCAPTCHA Settings"}
            </button>
          </div>
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

function centsToDollars(cents: string | undefined): string {
  const n = Number.parseInt(cents ?? "0", 10);
  if (Number.isNaN(n) || n === 0) return "";
  return (n / 100).toFixed(2);
}

function PriceField({
  label, centsValue, onCentsChange,
}: {
  label: string; centsValue: string | undefined; onCentsChange: (cents: string) => void;
}) {
  const [display, setDisplay] = useState(() => centsToDollars(centsValue));
  const [focused, setFocused] = useState(false);

  // Sync from parent when not focused (e.g. after save refreshes values)
  const prevCents = useRef(centsValue);
  if (!focused && centsValue !== prevCents.current) {
    prevCents.current = centsValue;
    setDisplay(centsToDollars(centsValue));
  }

  function handleBlur() {
    setFocused(false);
    const cleaned = display.replace(/[^0-9.]/g, "");
    const parsed = Number.parseFloat(cleaned);
    if (cleaned === "" || Number.isNaN(parsed)) {
      onCentsChange("0");
      setDisplay("");
    } else {
      const cents = Math.round(parsed * 100);
      onCentsChange(String(cents));
      setDisplay((cents / 100).toFixed(2));
    }
    prevCents.current = undefined; // force re-sync on next render
  }

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={display}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          onChange={(e) => setDisplay(e.target.value)}
          className={inputCls + " pl-7"}
          placeholder="0.00"
        />
      </div>
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
          className="rounded-md border border-[#E2E8F0] px-2 text-xs text-slate-700 hover:bg-[#F8FAFF]"
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
