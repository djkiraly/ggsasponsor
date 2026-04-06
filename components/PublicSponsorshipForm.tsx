"use client";

import React, { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PaymentMethodType, SponsorshipType } from "@/lib/validations";

type SettingsMap = Record<string, string>;

function formatUsd(amountUsd: number) {
  return amountUsd.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

async function createPaymentIntent(params: {
  sponsorshipType: SponsorshipType;
  paymentMethodType: PaymentMethodType;
  applicantEmail?: string;
}) {
  const res = await fetch("/api/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to create payment intent");
  return data as { clientSecret: string; amount: number };
}

async function uploadToGcs(params: {
  filename: string;
  contentType: string;
  uploadType: "logo" | "banner";
  submissionId?: string;
}) {
  const res = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to get upload URL");
  return data as { signedUrl: string; publicUrl: string };
}

type SponsorshipSubmitPayload = {
  name: string;
  company?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
  sponsorshipType: SponsorshipType;
  paymentMethodType: PaymentMethodType;
  jerseyColorPrimary?: string;
  jerseyColorSecondary?: string;
  logoGcsUrl?: string;
  bannerGcsUrl?: string;
  stripePaymentIntentId: string;
};

async function postSponsorship(payload: SponsorshipSubmitPayload) {
  const res = await fetch("/api/sponsorships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to submit sponsorship");
  return data as { success: boolean; id: string };
}

const JERSEY_COLORS = [
  { name: "Red", hex: "#DC2626" },
  { name: "Blue", hex: "#2563EB" },
  { name: "Navy", hex: "#1E3A5F" },
  { name: "Green", hex: "#16A34A" },
  { name: "Black", hex: "#111827" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Orange", hex: "#EA580C" },
  { name: "Purple", hex: "#7C3AED" },
  { name: "Pink", hex: "#EC4899" },
];

function JerseyColorPicker({
  primary,
  secondary,
  onPrimaryChange,
  onSecondaryChange,
}: {
  primary: string | null;
  secondary: string | null;
  onPrimaryChange: (color: string | null) => void;
  onSecondaryChange: (color: string | null) => void;
}) {
  function handleClick(colorName: string) {
    if (primary === colorName) {
      onPrimaryChange(null);
    } else if (secondary === colorName) {
      onSecondaryChange(null);
    } else if (!primary) {
      onPrimaryChange(colorName);
    } else if (!secondary) {
      onSecondaryChange(colorName);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {JERSEY_COLORS.map((c) => {
          const isPrimary = primary === c.name;
          const isSecondary = secondary === c.name;
          const isSelected = isPrimary || isSecondary;

          return (
            <button
              key={c.name}
              type="button"
              onClick={() => handleClick(c.name)}
              className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-colors ${
                isSelected
                  ? "border-[#1C3FCF] bg-[#F0F4FF]"
                  : "border-[#E2E8F0] bg-white hover:border-slate-300"
              }`}
              title={c.name}
              aria-pressed={isSelected}
            >
              <div
                className="h-10 w-10 rounded-full border border-slate-300"
                style={{ backgroundColor: c.hex }}
              />
              <span className="text-xs font-medium text-slate-900">{c.name}</span>
              {isPrimary && (
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#1C3FCF" }}>
                  Primary
                </span>
              )}
              {isSecondary && (
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#1C3FCF" }}>
                  Secondary
                </span>
              )}
            </button>
          );
        })}
      </div>
      {(primary || secondary) && (
        <div className="mt-3 flex items-center gap-4 text-sm text-slate-700">
          {primary && (
            <span>
              <strong>Primary:</strong> {primary}
            </span>
          )}
          {secondary && (
            <span>
              <strong>Secondary:</strong> {secondary}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentSection(props: {
  clientSecret: string;
  amountUsd: number;
  sponsorshipType: SponsorshipType;
  paymentMethodType: PaymentMethodType;
  applicant: {
    name: string;
    company?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    email: string;
    phone: string;
  };
  jerseyColors: { primary?: string; secondary?: string };
  gcs: { logoGcsUrl?: string; bannerGcsUrl?: string };
  onPaymentClientSecretRefresh?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!stripe || !elements) throw new Error("Payment system not ready");

      const returnUrl = `${window.location.origin}/thank-you?name=${encodeURIComponent(
        props.applicant.name
      )}`;

      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: { return_url: returnUrl },
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      const paymentIntent = result.paymentIntent;
      if (!paymentIntent) {
        throw new Error("Payment did not succeed");
      }

      // Card payments resolve immediately as "succeeded".
      // ACH (us_bank_account) payments may be "processing" — that is expected;
      // the webhook will update the status once the bank transfer settles.
      if (paymentIntent.status !== "succeeded" && paymentIntent.status !== "processing") {
        throw new Error("Payment did not succeed");
      }

      await postSponsorship({
        ...props.applicant,
        company: props.applicant.company || undefined,
        sponsorshipType: props.sponsorshipType,
        paymentMethodType: props.paymentMethodType,
        jerseyColorPrimary: props.jerseyColors.primary,
        jerseyColorSecondary: props.jerseyColors.secondary,
        logoGcsUrl: props.gcs.logoGcsUrl,
        bannerGcsUrl: props.gcs.bannerGcsUrl,
        stripePaymentIntentId: paymentIntent.id,
      });

      window.location.href = `${window.location.origin}/thank-you?name=${encodeURIComponent(
        props.applicant.name
      )}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Payment form">
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
        <div className="text-sm font-semibold text-slate-700">
          Total
        </div>
        <div className="mt-1 text-2xl font-bold" style={{ color: "#1C3FCF" }}>
          {formatUsd(props.amountUsd)}
        </div>

        <div className="mt-4">
          <PaymentElement />
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-md px-5 py-3 font-semibold text-white"
        style={{ background: "#1C3FCF", opacity: submitting ? 0.7 : 1 }}
      >
        {submitting ? "Processing..." : `Submit & Pay ${formatUsd(props.amountUsd)}`}
      </button>
    </form>
  );
}

export function PublicSponsorshipForm({
  stripePublishableKey,
}: {
  stripePublishableKey: string;
}) {
  const stripePromise = useMemo(() => {
    if (!stripePublishableKey) return null;
    return loadStripe(stripePublishableKey);
  }, [stripePublishableKey]);

  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [submissionId] = useState(() => {
    // Used to keep logo/banner paths under the same submission prefix.
    const c = (globalThis as unknown as {
      crypto?: { randomUUID?: () => string };
    }).crypto;
    if (c?.randomUUID) return c.randomUUID();
    return `sub_${Math.random().toString(16).slice(2)}`;
  });

  const [sponsorshipType, setSponsorshipType] = useState<SponsorshipType>("team");
  const [paymentMethodType, setPaymentMethodType] =
    useState<PaymentMethodType>("card");

  const [applicant, setApplicant] = useState({
    name: "",
    company: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    email: "",
    phone: "",
  });

  const [jerseyPrimary, setJerseyPrimary] = useState<string | null>(null);
  const [jerseySecondary, setJerseySecondary] = useState<string | null>(null);

  const [logoGcsUrl, setLogoGcsUrl] = useState<string | undefined>(undefined);
  const [bannerGcsUrl, setBannerGcsUrl] = useState<string | undefined>(undefined);

  const [clientSecret, setClientSecret] = useState<string>("");
  const [amountUsd, setAmountUsd] = useState<number>(0);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load settings");
        if (!mounted) return;
        setSettings(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load settings";
        if (!mounted) return;
        setSettingsError(msg);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const priceCents = useMemo(() => {
    if (!settings) return 0;
    const key =
      sponsorshipType === "team"
        ? "price_team_cents"
        : sponsorshipType === "banner"
          ? "price_banner_cents"
          : "price_both_cents";
    return Number.parseInt(settings[key] ?? "0", 10);
  }, [settings, sponsorshipType]);

  useEffect(() => {
    // Keep amount + PaymentIntent aligned with current tier/payment method.
    // PaymentIntent is only created when we have stripe + settings + email.
    if (!stripePromise || !settings) return;
    if (!applicant.email) return;

    let mounted = true;
    setIntentLoading(true);
    setIntentError(null);

    createPaymentIntent({
      sponsorshipType,
      paymentMethodType,
      applicantEmail: applicant.email,
    })
      .then((data) => {
        if (!mounted) return;
        setClientSecret(data.clientSecret);
        setAmountUsd(data.amount);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to create payment";
        if (!mounted) return;
        setIntentError(msg);
      })
      .finally(() => {
        if (!mounted) return;
        setIntentLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [stripePromise, settings, sponsorshipType, paymentMethodType, applicant.email]);

  const tiers = [
    {
      key: "team" as const,
      title: "Team Sponsorship",
      bullets: [
        "Company name on team jersey",
        "Recognition at games",
        "Social media shoutout",
      ],
    },
    {
      key: "banner" as const,
      title: "Banner Sponsorship",
      bullets: ["4×8 ft banner displayed at the softball complex all season"],
    },
    {
      key: "both" as const,
      title: "Team + Banner (Both)",
      bullets: ["Everything in both tiers at a bundled price"],
    },
  ];

  async function onFileSelected(params: {
    uploadType: "logo" | "banner";
    file: File;
  }) {
    const maxBytes = params.uploadType === "logo" ? 10 * 1024 * 1024 : 25 * 1024 * 1024;
    if (params.file.size > maxBytes) {
      throw new Error(
        params.uploadType === "logo"
          ? "Logo must be 10MB or less"
          : "Banner must be 25MB or less"
      );
    }

    const contentType = params.file.type || "application/octet-stream";
    const { signedUrl, publicUrl } = await uploadToGcs({
      filename: params.file.name,
      contentType,
      uploadType: params.uploadType,
      submissionId,
    });

    const putRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: params.file,
    });

    if (!putRes.ok) {
      throw new Error("File upload failed");
    }

    if (params.uploadType === "logo") setLogoGcsUrl(publicUrl);
    else setBannerGcsUrl(publicUrl);
  }

  const showBannerUpload = sponsorshipType === "banner" || sponsorshipType === "both";

  return (
    <div className="min-h-screen bg-white">
      <Header logoUrl={settings?.hero_logo_url} />

      <main className="mx-auto flex w-full max-w-5xl flex-col px-4 py-10">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          {settings?.hero_logo_url ? (
            <img
              src={settings.hero_logo_url}
              alt={settings?.org_name || "GGSA"}
              className="h-32 w-32 flex-shrink-0 rounded-lg border border-[#E2E8F0] bg-white object-contain p-1"
            />
          ) : (
            <div
              className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFF]"
              aria-hidden="true"
            >
              <span className="text-2xl font-bold" style={{ color: "#1C3FCF" }}>GGSA</span>
            </div>
          )}
          <div>
            <div
              className="prose prose-lg max-w-none text-slate-900 [&_a]:text-[#1C3FCF] [&_a]:underline"
              dangerouslySetInnerHTML={{
                __html:
                  settings?.hero_heading ||
                  "<p><strong>Gering Girls Softball Association</strong></p>",
              }}
            />
            <div
              className="mt-3 prose prose-sm max-w-none text-slate-700 [&_a]:text-[#1C3FCF] [&_a]:underline"
              dangerouslySetInnerHTML={{
                __html:
                  settings?.hero_body ||
                  "<p>GGSA sponsorships help support the girls of Gering\u2019s softball program. Your contribution helps with equipment, training, and more.</p>",
              }}
            />
          </div>
        </section>

        <div className="mt-8 rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-5 shadow-sm">
          <div className="space-y-6">
            <section aria-label="Your Information">
              <div className="mb-3 text-sm font-semibold" style={{ color: "#1C3FCF" }}>
                Your Information
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-800">Full Name</label>
                  <input
                    required
                    value={applicant.name}
                    onChange={(e) => setApplicant((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
                    aria-label="Full Name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-800">Company / Organization (optional)</label>
                  <input
                    value={applicant.company}
                    onChange={(e) => setApplicant((p) => ({ ...p, company: e.target.value }))}
                    className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
                    aria-label="Company or Organization"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-slate-800">Street Address</label>
                  <input
                    required
                    value={applicant.address}
                    onChange={(e) => setApplicant((p) => ({ ...p, address: e.target.value }))}
                    className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
                    aria-label="Street Address"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-800">City</label>
                  <input
                    required
                    value={applicant.city}
                    onChange={(e) => setApplicant((p) => ({ ...p, city: e.target.value }))}
                    className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
                    aria-label="City"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-800">State (2-letter)</label>
                  <input
                    required
                    value={applicant.state}
                    onChange={(e) => setApplicant((p) => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }))}
                    className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
                    aria-label="State"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-800">ZIP Code</label>
                  <input
                    required
                    value={applicant.zip}
                    onChange={(e) => setApplicant((p) => ({ ...p, zip: e.target.value }))}
                    className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
                    aria-label="ZIP Code"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-800">Phone Number</label>
                  <input
                    required
                    value={applicant.phone}
                    onChange={(e) => setApplicant((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
                    aria-label="Phone Number"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-slate-800">Email Address</label>
                  <input
                    required
                    type="email"
                    value={applicant.email}
                    onChange={(e) => setApplicant((p) => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
                    aria-label="Email Address"
                  />
                </div>
              </div>
            </section>

            <section aria-label="Sponsorship Type">
              <div className="mb-3 text-sm font-semibold" style={{ color: "#1C3FCF" }}>
                Sponsorship Type
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {tiers.map((t) => {
                  const selected = sponsorshipType === t.key;
                  const price =
                    t.key === "team"
                      ? settings?.price_team_cents
                      : t.key === "banner"
                        ? settings?.price_banner_cents
                        : settings?.price_both_cents;

                  const priceUsd = price ? Number.parseInt(price, 10) / 100 : 0;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setSponsorshipType(t.key)}
                      className="text-left rounded-lg border p-4 transition-colors"
                      style={{
                        borderColor: selected ? "#1C3FCF" : "#E2E8F0",
                        background: selected ? "#F0F4FF" : "#FFFFFF",
                      }}
                      aria-pressed={selected}
                    >
                      <div className="text-lg font-bold" style={{ color: "#1C3FCF" }}>
                        {t.title}
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {settings ? formatUsd(priceUsd) : "—"}
                      </div>
                      <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
                        {t.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </section>

            {(sponsorshipType === "team" || sponsorshipType === "both") && (
              <section aria-label="Jersey Color Selection">
                <div className="mb-3 text-sm font-semibold" style={{ color: "#1C3FCF" }}>
                  Jersey Colors
                </div>
                <p className="mb-3 text-sm text-slate-700">
                  Select up to two colors for your team jersey (primary and secondary).
                </p>
                <JerseyColorPicker
                  primary={jerseyPrimary}
                  secondary={jerseySecondary}
                  onPrimaryChange={setJerseyPrimary}
                  onSecondaryChange={setJerseySecondary}
                />
              </section>
            )}

            <section aria-label="Logo and Banner Upload">
              <div className="mb-3 text-sm font-semibold" style={{ color: "#1C3FCF" }}>
                Logo / Banner Design Upload
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                  <label className="block text-sm font-semibold text-slate-800">Upload your company logo (optional)</label>
                  <input
                    className="mt-2 block w-full text-sm text-slate-700"
                    type="file"
                    accept="image/png,image/jpeg,application/pdf,image/svg+xml"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        await onFileSelected({ uploadType: "logo", file: f });
                      } catch (err) {
                        alert(err instanceof Error ? err.message : "Upload failed");
                      }
                    }}
                    aria-label="Upload company logo"
                  />
                  {logoGcsUrl ? (
                    <p className="mt-2 text-sm text-slate-700">
                      Uploaded successfully.
                    </p>
                  ) : null}
                </div>

                {showBannerUpload ? (
                  <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                    <label className="block text-sm font-semibold text-slate-800">Upload your banner design (optional)</label>
                    <input
                      className="mt-2 block w-full text-sm text-slate-700"
                      type="file"
                      accept="image/png,image/jpeg,application/pdf,image/svg+xml"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          await onFileSelected({ uploadType: "banner", file: f });
                        } catch (err) {
                          alert(err instanceof Error ? err.message : "Upload failed");
                        }
                      }}
                      aria-label="Upload banner design"
                    />
                    {bannerGcsUrl ? (
                      <p className="mt-2 text-sm text-slate-700">
                        Uploaded successfully.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            <section aria-label="Payment">
              <div className="mb-3 text-sm font-semibold" style={{ color: "#1C3FCF" }}>
                Payment Method
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <button
                  type="button"
                  onClick={() => setPaymentMethodType("card")}
                  className="rounded-lg border px-4 py-3 text-left"
                  style={{
                    borderColor: paymentMethodType === "card" ? "#1C3FCF" : "#E2E8F0",
                    background: paymentMethodType === "card" ? "#F0F4FF" : "#FFFFFF",
                  }}
                  aria-pressed={paymentMethodType === "card"}
                >
                  <div className="font-semibold text-slate-900">Credit / Debit Card</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethodType("us_bank_account")}
                  className="rounded-lg border px-4 py-3 text-left"
                  style={{
                    borderColor:
                      paymentMethodType === "us_bank_account" ? "#1C3FCF" : "#E2E8F0",
                    background: paymentMethodType === "us_bank_account" ? "#F0F4FF" : "#FFFFFF",
                  }}
                  aria-pressed={paymentMethodType === "us_bank_account"}
                >
                  <div className="font-semibold text-slate-900">Bank Account (ACH)</div>
                </button>
              </div>

              <div className="mt-4">
                {settingsError ? (
                  <p className="text-sm text-red-600" role="alert">
                    {settingsError}
                  </p>
                ) : null}

                {intentError ? (
                  <p className="text-sm text-red-600" role="alert">
                    {intentError}
                  </p>
                ) : null}

                {!stripePromise ? (
                  <p className="text-sm text-slate-700">
                    Stripe is not configured.
                  </p>
                ) : clientSecret ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <PaymentSection
                      clientSecret={clientSecret}
                      amountUsd={amountUsd}
                      sponsorshipType={sponsorshipType}
                      paymentMethodType={paymentMethodType}
                      applicant={{
                        name: applicant.name,
                        company: applicant.company || undefined,
                        address: applicant.address,
                        city: applicant.city,
                        state: applicant.state,
                        zip: applicant.zip,
                        email: applicant.email,
                        phone: applicant.phone,
                      }}
                      jerseyColors={{
                        primary: jerseyPrimary ?? undefined,
                        secondary: jerseySecondary ?? undefined,
                      }}
                      gcs={{
                        logoGcsUrl,
                        bannerGcsUrl,
                      }}
                    />
                  </Elements>
                ) : (
                  <p className="text-sm text-slate-700">
                    {intentLoading ? "Preparing payment..." : "Select options to begin payment."}
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer contactEmail={settings?.contact_email} />
    </div>
  );
}

