"use client";

import { Suspense } from "react";
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
  const searchParams = useSearchParams();

  const name = searchParams.get("name")?.trim() || "Sponsor";
  const email = searchParams.get("email") || "";
  const company = searchParams.get("company") || "";
  const type = searchParams.get("type") || "";
  const method = searchParams.get("method") || "";
  const amountRaw = searchParams.get("amount");
  const amount = amountRaw ? Number.parseFloat(amountRaw) : 0;
  const paymentIntentId = searchParams.get("pi") || "";
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="print:hidden">
        <Header />
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
            Gering Girls Softball Association &bull; info@geringgirlssoftball.org
          </div>
        </div>

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
        <Footer />
      </div>
    </div>
  );
}
