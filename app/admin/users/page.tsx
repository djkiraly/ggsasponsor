export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireAdminRole } from "@/auth";
import { UsersManager } from "@/components/admin/UsersManager";

export default async function AdminUsersPage() {
  const session = await requireAdminRole();
  if (!session) redirect("/admin");

  const currentUserId = (session.user as { id?: string })?.id ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "#1C3FCF" }}>Users</h1>
        <p className="mt-2 text-slate-700">
          Manage admin and user accounts.
        </p>
      </div>
      <UsersManager currentUserId={currentUserId} />
    </div>
  );
}
