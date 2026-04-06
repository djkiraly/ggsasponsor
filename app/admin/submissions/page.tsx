"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Sponsorship = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  sponsorship_type: string;
  amount_paid_cents: number;
  status: string;
  stripe_payment_status: string | null;
  payment_method_type: string | null;
  created_at: string;
};

type ApiResponse = {
  items: Sponsorship[];
  page: number;
  limit: number;
  total: number;
};

function formatUsd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  pending: { cls: "bg-amber-100 text-amber-800", label: "Pending" },
  approved: { cls: "bg-green-100 text-green-800", label: "Approved" },
  rejected: { cls: "bg-red-100 text-red-800", label: "Rejected" },
};

const TYPE_LABEL: Record<string, string> = {
  team: "Team",
  banner: "Banner",
  both: "Both",
};

const selectCls =
  "min-h-[44px] rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]";
const inputCls =
  "min-h-[44px] rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]";

export default function AdminSubmissionsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [showReport, setShowReport] = useState(false);
  const [reportEmail, setReportEmail] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportMsg, setReportMsg] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, debouncedSearch]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);

    fetch(`/api/admin/sponsorships?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((json) => {
        if (mounted) setData(json);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [page, statusFilter, typeFilter, debouncedSearch]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "#1C3FCF" }}>
          Submissions
        </h1>
        <p className="mt-2 text-slate-700">
          Review and manage sponsorship submissions.
        </p>
      </div>

      {/* Email Report */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => { setShowReport(!showReport); setReportMsg(null); }}
          className="inline-flex items-center gap-2 rounded-md border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#F8FAFF]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          Email Report
        </button>
      </div>

      {showReport && (
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Email Submissions Report</h3>
          <p className="mb-3 text-xs text-slate-500">Send a complete report of all submissions to the specified email address.</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-semibold text-slate-800">Recipient Email</label>
              <input
                type="email"
                value={reportEmail}
                onChange={(e) => setReportEmail(e.target.value)}
                placeholder="recipient@example.com"
                className={`${inputCls} w-full`}
              />
            </div>
            <button
              type="button"
              disabled={reportSending || !reportEmail}
              onClick={async () => {
                setReportSending(true);
                setReportMsg(null);
                try {
                  const res = await fetch("/api/admin/report", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: reportEmail }),
                  });
                  const d = await res.json();
                  if (!res.ok) throw new Error(d.error || "Failed to send");
                  setReportMsg(`Report sent to ${reportEmail} (${d.count} submissions).`);
                  setReportEmail("");
                } catch (err) {
                  setReportMsg(`Error: ${err instanceof Error ? err.message : "Failed to send report."}`);
                } finally {
                  setReportSending(false);
                }
              }}
              className="inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-70"
              style={{ background: "#1C3FCF" }}
            >
              {reportSending ? "Sending..." : "Send Report"}
            </button>
          </div>
          {reportMsg && (
            <p className={`mt-3 text-sm ${reportMsg.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>
              {reportMsg}
            </p>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] px-4 py-3 shadow-sm md:flex-row md:flex-wrap md:items-center md:px-5">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
          <option value="">All Types</option>
          <option value="team">Team</option>
          <option value="banner">Banner</option>
          <option value="both">Both</option>
        </select>
        <input
          type="text"
          placeholder="Search name, company, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} w-full sm:w-64`}
        />
        {data && (
          <span className="ml-auto text-xs text-slate-500">
            {data.total} result{data.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : loading && !data ? (
        <div className="flex items-center gap-2 py-10">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#1C3FCF]" />
          <span className="text-sm text-slate-500">Loading...</span>
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] px-5 py-10 text-center shadow-sm">
          <p className="text-sm text-slate-700">No submissions found.</p>
        </div>
      ) : data ? (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-[#E2E8F0] shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8FAFF] text-xs font-semibold uppercase tracking-wider text-slate-700">
                  <tr>
                    <th className="px-5 py-3">Sponsor</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Payment Type</th>
                    <th className="px-5 py-3">Payment Status</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {data.items.map((item) => {
                    const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
                    return (
                      <tr key={item.id} className="hover:bg-[#F8FAFF]">
                        <td className="px-5 py-3">
                          <Link href={`/admin/submissions/${item.id}`} className="font-medium text-slate-900 hover:text-[#1C3FCF] hover:underline">
                            {item.name}
                          </Link>
                          {item.company && (
                            <div className="text-xs text-slate-500">{item.company}</div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-700">{TYPE_LABEL[item.sponsorship_type] ?? item.sponsorship_type}</td>
                        <td className="px-5 py-3 font-medium text-slate-900">{formatUsd(item.amount_paid_cents)}</td>
                        <td className="px-5 py-3 text-slate-700">
                          {item.payment_method_type === "us_bank_account" ? "ACH" : item.payment_method_type === "card" ? "Card" : item.payment_method_type === "check" ? "Check" : item.payment_method_type ?? "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            item.stripe_payment_status === "succeeded"
                              ? "bg-green-100 text-green-800"
                              : item.stripe_payment_status === "processing"
                                ? "bg-blue-100 text-blue-800"
                                : item.stripe_payment_status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-slate-100 text-slate-700"
                          }`}>
                            {item.stripe_payment_status ?? "unknown"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          <div>{new Date(item.created_at).toLocaleDateString()}</div>
                          <div className="text-xs">{new Date(item.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="divide-y divide-[#E2E8F0] overflow-hidden rounded-lg border border-[#E2E8F0] shadow-sm md:hidden">
            {data.items.map((item) => {
              const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
              const pmtLabel =
                item.payment_method_type === "us_bank_account" ? "ACH"
                : item.payment_method_type === "card" ? "Card"
                : item.payment_method_type === "check" ? "Check"
                : item.payment_method_type ?? "—";
              return (
                <Link
                  key={item.id}
                  href={`/admin/submissions/${item.id}`}
                  className="block bg-white px-4 py-3 active:bg-[#F0F4FF]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{item.name}</p>
                      {item.company && (
                        <p className="truncate text-xs text-slate-500">{item.company}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{TYPE_LABEL[item.sponsorship_type] ?? item.sponsorship_type}</span>
                    <span className="font-medium text-slate-900">{formatUsd(item.amount_paid_cents)}</span>
                    <span>{pmtLabel}</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="min-h-[44px] rounded-md border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#F8FAFF] disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="min-h-[44px] rounded-md border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#F8FAFF] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
