import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, inArray } from "drizzle-orm";

import { requireDb } from "@/lib/db";
import { sponsorships } from "@/db/schema";
import { requireAdminRole } from "@/auth";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  team: "Team",
  both: "Team + Banner",
};

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  pending: { cls: "bg-amber-100 text-amber-800", label: "Pending" },
  approved: { cls: "bg-green-100 text-green-800", label: "Approved" },
  rejected: { cls: "bg-red-100 text-red-800", label: "Rejected" },
};

const COLOR_HEX: Record<string, string> = {
  red: "#DC2626",
  blue: "#2563EB",
  navy: "#1E3A8A",
  green: "#16A34A",
  black: "#111827",
  white: "#FFFFFF",
  yellow: "#FACC15",
  orange: "#EA580C",
  purple: "#7C3AED",
  pink: "#EC4899",
};

function Swatch({ name }: { name: string | null }) {
  if (!name) {
    return <span className="text-xs italic text-slate-400">—</span>;
  }
  const hex = COLOR_HEX[name.toLowerCase()] ?? "#94A3B8";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block h-4 w-4 rounded-full border border-slate-300 shadow-sm"
        style={{ backgroundColor: hex }}
        aria-hidden="true"
      />
      <span className="text-sm text-slate-800">{name}</span>
    </span>
  );
}

export default async function JerseyColorsReportPage() {
  const session = await requireAdminRole();
  if (!session) redirect("/admin");

  const db = requireDb();
  const items = await db
    .select({
      id: sponsorships.id,
      name: sponsorships.name,
      company: sponsorships.company,
      email: sponsorships.email,
      sponsorship_type: sponsorships.sponsorship_type,
      jersey_color_primary: sponsorships.jersey_color_primary,
      jersey_color_secondary: sponsorships.jersey_color_secondary,
      status: sponsorships.status,
      created_at: sponsorships.created_at,
    })
    .from(sponsorships)
    .where(inArray(sponsorships.sponsorship_type, ["team", "both"]))
    .orderBy(desc(sponsorships.created_at));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "#1C3FCF" }}>
          Jersey Colors Report
        </h1>
        <p className="mt-2 text-slate-700">
          Team and Team+Banner sponsors with their selected jersey colors.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {items.length} sponsor{items.length !== 1 ? "s" : ""}
        </span>
        <a
          href="/api/admin/jersey-colors/export"
          className="inline-flex items-center gap-2 rounded-md border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#F8FAFF]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </a>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] px-5 py-10 text-center shadow-sm">
          <p className="text-sm text-slate-700">No team or team+banner sponsors yet.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-[#E2E8F0] shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8FAFF] text-xs font-semibold uppercase tracking-wider text-slate-700">
                  <tr>
                    <th className="px-5 py-3">Sponsor</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Primary Color</th>
                    <th className="px-5 py-3">Secondary Color</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {items.map((item) => {
                    const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
                    return (
                      <tr key={item.id} className="hover:bg-[#F8FAFF]">
                        <td className="px-5 py-3">
                          <Link
                            href={`/admin/submissions/${item.id}`}
                            className="font-medium text-slate-900 hover:text-[#1C3FCF] hover:underline"
                          >
                            {item.name}
                          </Link>
                          {item.company && (
                            <div className="text-xs text-slate-500">{item.company}</div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          {TYPE_LABEL[item.sponsorship_type] ?? item.sponsorship_type}
                        </td>
                        <td className="px-5 py-3">
                          <Swatch name={item.jersey_color_primary} />
                        </td>
                        <td className="px-5 py-3">
                          <Swatch name={item.jersey_color_secondary} />
                        </td>
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
          </div>

          {/* Mobile card list */}
          <div className="divide-y divide-[#E2E8F0] overflow-hidden rounded-lg border border-[#E2E8F0] shadow-sm md:hidden">
            {items.map((item) => {
              const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
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
                  <div className="mt-2 text-xs text-slate-500">
                    {TYPE_LABEL[item.sponsorship_type] ?? item.sponsorship_type}
                    {" · "}
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Primary</span>
                      <Swatch name={item.jersey_color_primary} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Secondary</span>
                      <Swatch name={item.jersey_color_secondary} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
