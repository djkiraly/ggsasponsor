export const dynamic = "force-dynamic";

export default async function AdminSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Submission Details</h1>
        <p className="mt-1 text-sm text-slate-500">
          ID: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">{id}</code>
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-slate-500">
            Detail panel placeholder. Will display applicant info, file links,
            status updates, and notes.
          </p>
        </div>
      </div>
    </div>
  );
}
