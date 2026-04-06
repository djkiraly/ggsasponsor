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
  "rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]";
const inputCls =
  "rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]";

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

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] px-5 py-3 shadow-sm">
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
          <div className="overflow-hidden rounded-lg border border-[#E2E8F0] shadow-sm">
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
                          {item.payment_method_type === "us_bank_account" ? "ACH" : item.payment_method_type === "card" ? "Card" : item.payment_method_type ?? "—"}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#F8FAFF] disabled:opacity-50"
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
                className="rounded-md border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#F8FAFF] disabled:opacity-50"
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
