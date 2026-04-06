"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/useIsMobile";

const AUTH_BASE = "/api/admin/login";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Dashboard",
    roles: ["admin", "user"],
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
      </svg>
    ),
  },
  {
    href: "/admin/submissions",
    label: "Submissions",
    roles: ["admin", "user"],
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Users",
    roles: ["admin"],
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197v0" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    roles: ["admin"],
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function AdminBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [role, setRole] = useState<string>("user");

  useEffect(() => {
    fetch(`${AUTH_BASE}/session`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.role) setRole(data.user.role);
      })
      .catch(() => {});
  }, []);

  if (!isMobile) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E2E8F0] bg-white pb-safe md:hidden">
      <div className="flex items-stretch justify-around">
        {visibleItems.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                active
                  ? "text-[#1C3FCF]"
                  : "text-slate-500 active:text-slate-700"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-slate-500 transition-colors active:text-slate-700"
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
