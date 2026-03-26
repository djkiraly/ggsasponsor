"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const AUTH_BASE = "/api/admin/login";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialError = searchParams.get("error");

  if (initialError && !error) {
    setError("Login failed. Please check your email and password.");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const csrfRes = await fetch(`${AUTH_BASE}/csrf`);
      const { csrfToken } = await csrfRes.json();

      const res = await fetch(`${AUTH_BASE}/callback/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          csrfToken,
          email,
          password,
          callbackUrl: "/admin",
          json: "true",
        }),
        redirect: "follow",
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError("Login failed. Please check your email and password.");
        return;
      }

      router.push(data.url || "/admin");
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        {/* Logo block */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#1C3FCF]">
            <span className="text-lg font-bold text-white">G</span>
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">GGSA Admin</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-5">
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#1C3FCF] focus:ring-2 focus:ring-[#1C3FCF]/20"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#1C3FCF] focus:ring-2 focus:ring-[#1C3FCF]/20"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#1C3FCF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
