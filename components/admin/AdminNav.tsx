"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const AUTH_BASE = "/api/admin/login";

const ALL_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", roles: ["admin", "user"] },
  { href: "/admin/submissions", label: "Submissions", roles: ["admin", "user"] },
  { href: "/admin/users", label: "Users", roles: ["admin"] },
  { href: "/admin/settings", label: "Settings", roles: ["admin"] },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>("user");

  useEffect(() => {
    fetch(`${AUTH_BASE}/session`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.role) setRole(data.user.role);
      })
      .catch(() => {});
  }, []);

  const navItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(role));

  async function handleSignOut() {
    try {
      const csrfRes = await fetch(`${AUTH_BASE}/csrf`);
      const { csrfToken } = await csrfRes.json();
      await fetch(`${AUTH_BASE}/signout`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken, json: "true" }),
      });
    } catch {
      // sign out even if the API call fails
    }
    router.push("/admin/login");
  }

  return (
    <nav className="hidden w-full border-b border-[#E2E8F0] bg-[#F8FAFF] md:block">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-2">
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#1C3FCF] text-white"
                    : "text-slate-700 hover:bg-[#E2E8F0] hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#E2E8F0] hover:text-slate-900"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
