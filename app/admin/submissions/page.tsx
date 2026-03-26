export const dynamic = "force-dynamic";

export default function AdminSubmissionsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Submissions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review and manage sponsorship submissions.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Filters
        </span>
        <span className="text-sm text-slate-400">
          Status, type, and search filters will connect to the API.
        </span>
      </div>

      {/* Table placeholder */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-slate-500">
            Submissions table placeholder. Connect to{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">
              GET /api/admin/sponsorships
            </code>{" "}
            for live data.
          </p>
        </div>
      </div>
    </div>
  );
}
