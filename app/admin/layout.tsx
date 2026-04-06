import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
    <div className="flex min-h-screen flex-col bg-white">
      <Header title="GGSA Admin Portal" />
      <AdminNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-8 md:pb-8">{children}</main>
      <Footer />
      <AdminBottomNav />
    </div>
  );
}
