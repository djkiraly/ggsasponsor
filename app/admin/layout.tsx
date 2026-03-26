import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { getAdminServerSession } from "@/auth";

import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const heads = await headers();
  const isLoginPage = heads.get("x-admin-login") === "1";

  if (!isLoginPage) {
    const session = await getAdminServerSession();
    if (!session) redirect("/admin/login");
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-900 md:flex">
        <div className="flex h-14 items-center gap-2 px-5">
          <div className="h-7 w-7 rounded-md bg-[#1C3FCF]" />
          <span className="text-sm font-bold tracking-wide text-white">GGSA Admin</span>
        </div>
        <AdminNav />
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-slate-200 bg-white px-6">
          <h2 className="text-sm font-medium text-slate-500">Sponsorship Portal</h2>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
