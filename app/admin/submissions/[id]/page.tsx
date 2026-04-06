export const dynamic = "force-dynamic";

export default async function AdminSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "#1C3FCF" }}>
          Submission Details
        </h1>
        <p className="mt-2 text-slate-700">
          ID: <code className="rounded bg-[#F8FAFF] border border-[#E2E8F0] px-1.5 py-0.5 text-xs font-mono text-slate-900">{id}</code>
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] shadow-sm">
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-slate-700">
            Detail panel placeholder. Will display applicant info, file links,
            status updates, and notes.
          </p>
        </div>
      </div>
    </div>
  );
}
