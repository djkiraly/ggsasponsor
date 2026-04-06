"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Sponsorship = {
  id: string;
  name: string;
  company: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
  sponsorship_type: string;
  amount_paid_cents: number;
  jersey_color_primary: string | null;
  jersey_color_secondary: string | null;
  logo_gcs_url: string | null;
  banner_gcs_url: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_status: string | null;
  payment_method_type: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

function formatUsd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const TYPE_LABEL: Record<string, string> = {
  team: "Team Sponsorship",
  banner: "Banner Sponsorship",
  both: "Team + Banner Sponsorship",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: "Credit / Debit Card",
  us_bank_account: "Bank Account (ACH)",
};

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  pending: { cls: "bg-amber-100 text-amber-800", label: "Pending" },
  approved: { cls: "bg-green-100 text-green-800", label: "Approved" },
  rejected: { cls: "bg-red-100 text-red-800", label: "Rejected" },
};

const btnCls =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-70";

export default function AdminSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Sponsorship | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  async function fetchItem() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sponsorships/${id}`);
      if (!res.ok) throw new Error("Submission not found");
      const data = await res.json();
      setItem(data);
      setNotes(data.notes ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchItem(); }, [id]);

  async function updateStatus(newStatus: string) {
    setSaving(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/sponsorships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setActionMsg(`Status updated to ${newStatus}.`);
      fetchItem();
    } catch {
      setActionMsg("Error: Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes() {
    setSaving(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/sponsorships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      setActionMsg("Notes saved.");
      fetchItem();
    } catch {
      setActionMsg("Error: Failed to save notes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#1C3FCF]" />
        <span className="text-sm text-slate-500">Loading submission...</span>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error ?? "Submission not found."}</p>
        <Link href="/admin/submissions" className="text-sm font-medium text-[#1C3FCF] hover:underline">
          Back to Submissions
        </Link>
      </div>
    );
  }

  const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/submissions" className="text-sm font-medium text-[#1C3FCF] hover:underline">
            &larr; Back to Submissions
          </Link>
          <h1 className="mt-2 text-3xl font-bold" style={{ color: "#1C3FCF" }}>
            {item.name}
          </h1>
          {item.company && <p className="mt-1 text-slate-700">{item.company}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {actionMsg && (
        <div className={`rounded-md px-4 py-2 text-sm ${actionMsg.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {actionMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Applicant Info */}
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "#1C3FCF" }}>Applicant Information</h2>
          <dl className="space-y-3 text-sm">
            <Row label="Name" value={item.name} />
            {item.company && <Row label="Company" value={item.company} />}
            <Row label="Email" value={item.email} />
            <Row label="Phone" value={item.phone} />
            <Row label="Address" value={`${item.address}, ${item.city}, ${item.state} ${item.zip}`} />
          </dl>
        </div>

        {/* Sponsorship Info */}
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "#1C3FCF" }}>Sponsorship Details</h2>
          <dl className="space-y-3 text-sm">
            <Row label="Type" value={TYPE_LABEL[item.sponsorship_type] ?? item.sponsorship_type} />
            <Row label="Amount Paid" value={formatUsd(item.amount_paid_cents)} />
            <Row label="Payment Type" value={PAYMENT_METHOD_LABEL[item.payment_method_type ?? ""] ?? item.payment_method_type ?? "Unknown"} />
            <Row label="Payment Status" value={item.stripe_payment_status ?? "unknown"} />
            {item.jersey_color_primary && <Row label="Jersey Primary" value={item.jersey_color_primary} />}
            {item.jersey_color_secondary && <Row label="Jersey Secondary" value={item.jersey_color_secondary} />}
            <Row label="Submitted" value={new Date(item.created_at).toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })} />
            {item.stripe_payment_intent_id && (
              <Row label="Transaction ID" value={item.stripe_payment_intent_id} mono />
            )}
          </dl>
        </div>

        {/* Files */}
        {(item.logo_gcs_url || item.banner_gcs_url) && (
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold" style={{ color: "#1C3FCF" }}>Uploaded Files</h2>
            <div className="space-y-2 text-sm">
              {item.logo_gcs_url && (
                <div>
                  <span className="font-semibold text-slate-700">Logo: </span>
                  <a href={item.logo_gcs_url} target="_blank" rel="noopener noreferrer" className="text-[#1C3FCF] underline">
                    View file
                  </a>
                </div>
              )}
              {item.banner_gcs_url && (
                <div>
                  <span className="font-semibold text-slate-700">Banner: </span>
                  <a href={item.banner_gcs_url} target="_blank" rel="noopener noreferrer" className="text-[#1C3FCF] underline">
                    View file
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "#1C3FCF" }}>Admin Notes</h2>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
            placeholder="Add internal notes about this submission..."
          />
          <button
            type="button"
            disabled={saving}
            onClick={saveNotes}
            className={`${btnCls} mt-3 text-white`}
            style={{ background: "#1C3FCF" }}
          >
            {saving ? "Saving..." : "Save Notes"}
          </button>
        </div>
      </div>

      {/* Status Actions */}
      <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold" style={{ color: "#1C3FCF" }}>Update Status</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving || item.status === "approved"}
            onClick={() => updateStatus("approved")}
            className={`${btnCls} bg-green-600 text-white`}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={saving || item.status === "pending"}
            onClick={() => updateStatus("pending")}
            className={`${btnCls} border border-[#E2E8F0] bg-white text-slate-700`}
          >
            Set Pending
          </button>
          <button
            type="button"
            disabled={saving || item.status === "rejected"}
            onClick={() => updateStatus("rejected")}
            className={`${btnCls} bg-red-600 text-white`}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="font-semibold text-slate-700">{label}</dt>
      <dd className={`text-right text-slate-900 ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</dd>
    </div>
  );
}
