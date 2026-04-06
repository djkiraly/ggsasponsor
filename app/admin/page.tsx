import Link from "next/link";
import { count, eq, sql } from "drizzle-orm";

import { requireDb } from "@/lib/db";
import { sponsorships } from "@/db/schema";

export const dynamic = "force-dynamic";

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

export default async function AdminDashboardPage() {
  const db = requireDb();

  const [totalRows, revenueRows, pendingRows, approvedRows, recentItems] =
    await Promise.all([
      db.select({ count: count() }).from(sponsorships),
      db
        .select({ total: sql<number>`coalesce(sum(${sponsorships.amount_paid_cents}), 0)` })
        .from(sponsorships)
        .where(eq(sponsorships.stripe_payment_status, "succeeded")),
      db
        .select({ count: count() })
        .from(sponsorships)
        .where(eq(sponsorships.status, "pending")),
      db
        .select({ count: count() })
        .from(sponsorships)
        .where(eq(sponsorships.status, "approved")),
      db
        .select({
          id: sponsorships.id,
          name: sponsorships.name,
          company: sponsorships.company,
          email: sponsorships.email,
          sponsorship_type: sponsorships.sponsorship_type,
          amount_paid_cents: sponsorships.amount_paid_cents,
          status: sponsorships.status,
          stripe_payment_status: sponsorships.stripe_payment_status,
          created_at: sponsorships.created_at,
        })
        .from(sponsorships)
        .orderBy(sql`${sponsorships.created_at} desc`)
        .limit(5),
    ]);

  const totalSubmissions = totalRows[0]?.count ?? 0;
  const totalRevenueCents = Number(revenueRows[0]?.total ?? 0);
  const pendingCount = pendingRows[0]?.count ?? 0;
  const approvedCount = approvedRows[0]?.count ?? 0;

  const stats = [
    { label: "Total Submissions", value: String(totalSubmissions), accent: "bg-blue-500" },
    { label: "Total Revenue", value: formatUsd(totalRevenueCents), accent: "bg-emerald-500" },
    { label: "Pending", value: String(pendingCount), accent: "bg-amber-500" },
    { label: "Approved", value: String(approvedCount), accent: "bg-violet-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "#1C3FCF" }}>
          Dashboard
        </h1>
        <p className="mt-2 text-slate-700">Overview of sponsorship activity.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="relative overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-5 shadow-sm"
          >
            <div className={`absolute left-0 top-0 h-full w-1 ${s.accent}`} />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              {s.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent submissions */}
      <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Recent Submissions</h2>
          <Link
            href="/admin/submissions"
            className="text-sm font-medium text-[#1C3FCF] hover:underline"
          >
            View all
          </Link>
        </div>
        {recentItems.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-slate-700">No submissions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E2E8F0] text-xs font-semibold uppercase tracking-wider text-slate-700">
                <tr>
                  <th className="px-5 py-3">Sponsor</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {recentItems.map((item) => {
                  const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
                  return (
                    <tr key={item.id}>
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
                      <td className="px-5 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
