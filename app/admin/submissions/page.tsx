export const dynamic = "force-dynamic";

export default function AdminSubmissionsPage() {
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
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
          Filters
        </span>
        <span className="text-sm text-slate-700">
          Status, type, and search filters will connect to the API.
        </span>
      </div>

      {/* Table placeholder */}
      <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] shadow-sm">
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-slate-700">
            Submissions table placeholder. Connect to{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-xs font-mono text-slate-900">
              GET /api/admin/sponsorships
            </code>{" "}
            for live data.
          </p>
        </div>
      </div>
    </div>
  );
}
