export default function Loading() {
  return (
    <div className="flex items-center gap-2 p-6">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#1C3FCF]" />
      <span className="text-sm text-slate-500">Loading users...</span>
    </div>
  );
}
