import Link from "next/link";

export const dynamic = "force-dynamic";

const stats = [
  { label: "Total Submissions", value: "\u2014", accent: "bg-blue-500" },
  { label: "Total Revenue", value: "\u2014", accent: "bg-emerald-500" },
  { label: "Pending", value: "\u2014", accent: "bg-amber-500" },
  { label: "Approved", value: "\u2014", accent: "bg-violet-500" },
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of sponsorship activity.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className={`absolute left-0 top-0 h-full w-1 ${s.accent}`} />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {s.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent submissions */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Recent Submissions</h2>
          <Link
            href="/admin/submissions"
            className="text-sm font-medium text-[#1C3FCF] hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-slate-500">
            Submissions will appear here once connected to live data.
          </p>
        </div>
      </div>
    </div>
  );
}
