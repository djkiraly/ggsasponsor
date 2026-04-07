"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

function formatUsd(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const SPONSORSHIP_LABELS: Record<string, string> = {
  team: "Team Sponsorship",
  banner: "Banner Sponsorship",
  both: "Team + Banner Sponsorship",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "Credit / Debit Card",
  us_bank_account: "Bank Account (ACH)",
  check: "Check",
};

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#1C3FCF]" />
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}

function ThankYouContent() {
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSiteSettings).catch(() => {});
  }, []);
  const searchParams = useSearchParams();

  const name = searchParams.get("name")?.trim() || "Sponsor";
  const email = searchParams.get("email") || "";
  const company = searchParams.get("company") || "";
  const type = searchParams.get("type") || "";
  const method = searchParams.get("method") || "";
  const amountRaw = searchParams.get("amount");
  const amount = amountRaw ? Number.parseFloat(amountRaw) : 0;
  const paymentIntentId = searchParams.get("pi") || "";
  const submissionId = searchParams.get("sid") || "";
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="print:hidden">
        <Header logoUrl={siteSettings.hero_logo_url} />
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
        {/* Confirmation message — hidden when printing */}
        <div className="flex flex-col items-center text-center print:hidden">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "#1C3FCF" }}
            aria-hidden="true"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17L4 12" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 className="mt-6 text-3xl font-bold" style={{ color: "#1C3FCF" }}>
            Thank you, {name}!
          </h1>

          <p className="mt-4 text-base leading-relaxed text-slate-700">
            A receipt has been emailed to {email || "you"}. The GGSA team will follow up with next steps shortly.
          </p>
        </div>

        {/* Printable Receipt */}
        <div className="mt-8 rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm print:mt-0 print:border-0 print:shadow-none">
          {/* Print header — only visible when printing */}
          <div className="mb-6 hidden print:block">
            <div className="text-center">
              <h1 className="text-2xl font-bold" style={{ color: "#1C3FCF" }}>
                Gering Girls Softball Association
              </h1>
              <p className="mt-1 text-sm text-slate-700">Sponsorship Receipt</p>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between print:mb-6">
            <h2 className="text-lg font-semibold text-slate-900 print:text-xl">
              Sponsorship Receipt
            </h2>
            <span className="text-sm text-slate-500">{date}</span>
          </div>

          <table className="w-full text-sm">
            <tbody className="divide-y divide-[#E2E8F0]">
              <tr>
                <td className="py-3 pr-4 font-semibold text-slate-700">Name</td>
                <td className="py-3 text-slate-900">{name}</td>
              </tr>
              {company && (
                <tr>
                  <td className="py-3 pr-4 font-semibold text-slate-700">Company</td>
                  <td className="py-3 text-slate-900">{company}</td>
                </tr>
              )}
              {email && (
                <tr>
                  <td className="py-3 pr-4 font-semibold text-slate-700">Email</td>
                  <td className="py-3 text-slate-900">{email}</td>
                </tr>
              )}
              {type && (
                <tr>
                  <td className="py-3 pr-4 font-semibold text-slate-700">Sponsorship Type</td>
                  <td className="py-3 text-slate-900">{SPONSORSHIP_LABELS[type] || type}</td>
                </tr>
              )}
              {amount > 0 && (
                <tr>
                  <td className="py-3 pr-4 font-semibold text-slate-700">Amount Paid</td>
                  <td className="py-3 text-lg font-bold text-slate-900">{formatUsd(amount)}</td>
                </tr>
              )}
              {method && (
                <tr>
                  <td className="py-3 pr-4 font-semibold text-slate-700">Payment Method</td>
                  <td className="py-3 text-slate-900">{PAYMENT_METHOD_LABELS[method] || method}</td>
                </tr>
              )}
              {paymentIntentId && (
                <tr>
                  <td className="py-3 pr-4 font-semibold text-slate-700">Transaction ID</td>
                  <td className="py-3 font-mono text-xs text-slate-500">{paymentIntentId}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Print footer */}
          <div className="mt-6 hidden border-t border-[#E2E8F0] pt-4 text-center text-xs text-slate-500 print:block">
            {siteSettings.org_name || "Gering Girls Softball Association"} &bull; {siteSettings.contact_email || "info@geringgirlssoftball.org"}
          </div>
        </div>

        {/* Upload section — hidden when printing */}
        {submissionId && email && (
          <div className="mt-6 print:hidden">
            <ThankYouUploadSection submissionId={submissionId} email={email} type={type} />
          </div>
        )}

        {/* Action buttons — hidden when printing */}
        <div className="mt-6 flex items-center justify-center gap-4 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center rounded-md border border-[#E2E8F0] px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-[#F8FAFF]"
          >
            Print Receipt
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: "#1C3FCF" }}
          >
            Return Home
          </Link>
        </div>
      </main>

      <div className="print:hidden">
        <Footer contactEmail={siteSettings.contact_email} footerText={siteSettings.footer_text} />
      </div>
    </div>
  );
}

async function uploadFileToGcs(params: {
  file: File;
  uploadType: "logo" | "banner";
  submissionId: string;
}) {
  const maxBytes = params.uploadType === "logo" ? 10 * 1024 * 1024 : 25 * 1024 * 1024;
  if (params.file.size > maxBytes) {
    throw new Error(params.uploadType === "logo" ? "Logo must be 10MB or less." : "Banner must be 25MB or less.");
  }

  const contentType = params.file.type || "application/octet-stream";
  const urlRes = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: params.file.name,
      contentType,
      uploadType: params.uploadType,
      submissionId: params.submissionId,
    }),
  });
  const urlData = await urlRes.json();
  if (!urlRes.ok) throw new Error(urlData.error || "Failed to get upload URL");

  const putRes = await fetch(urlData.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: params.file,
  });
  if (!putRes.ok) throw new Error("File upload failed");

  return urlData.publicUrl as string;
}

function ThankYouUploadSection({
  submissionId,
  email,
  type,
}: {
  submissionId: string;
  email: string;
  type: string;
}) {
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [bannerUploaded, setBannerUploaded] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showBanner = type === "banner" || type === "both";

  async function handleUpload(uploadType: "logo" | "banner", file: File) {
    setUploading(uploadType);
    setError(null);
    try {
      const publicUrl = await uploadFileToGcs({ file, uploadType, submissionId });

      const saveRes = await fetch(`/api/sponsorships/${submissionId}/upload`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          ...(uploadType === "logo" ? { logo_gcs_url: publicUrl } : { banner_gcs_url: publicUrl }),
        }),
      });
      if (!saveRes.ok) {
        const d = await saveRes.json();
        throw new Error(d.error || "Failed to save file");
      }

      if (uploadType === "logo") setLogoUploaded(true);
      else setBannerUploaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Upload Files</h3>
      <p className="mt-1 mb-4 text-sm text-slate-500">
        You can upload or update your logo and banner files now or come back later.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-3">
        <UploadRow
          label="Company Logo"
          hint="PNG, JPEG, SVG, or PDF - max 10MB"
          uploaded={logoUploaded}
          loading={uploading === "logo"}
          accept="image/png,image/jpeg,application/pdf,image/svg+xml"
          onFile={(f) => handleUpload("logo", f)}
        />
        {showBanner && (
          <UploadRow
            label="Banner Design"
            hint="PNG, JPEG, SVG, or PDF - max 25MB"
            uploaded={bannerUploaded}
            loading={uploading === "banner"}
            accept="image/png,image/jpeg,application/pdf,image/svg+xml"
            onFile={(f) => handleUpload("banner", f)}
          />
        )}
      </div>
    </div>
  );
}

function UploadRow({
  label,
  hint,
  uploaded,
  loading,
  accept,
  onFile,
}: {
  label: string;
  hint: string;
  uploaded: boolean;
  loading: boolean;
  accept: string;
  onFile: (f: File) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3">
      {uploaded ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0F4FF]">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#1C3FCF" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-400">{hint}</p>
      </div>
      {uploaded ? (
        <label className="shrink-0 cursor-pointer text-xs font-medium text-[#1C3FCF] hover:underline">
          Replace
          <input type="file" className="hidden" accept={accept} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </label>
      ) : (
        <label
          className={`inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white ${loading ? "opacity-70" : ""}`}
          style={{ background: "#1C3FCF" }}
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Uploading...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload
            </>
          )}
          <input type="file" className="hidden" accept={accept} disabled={loading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </label>
      )}
    </div>
  );
}
