"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

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

  async function checkLoginStatus(userEmail: string) {
    try {
      const res = await fetch("/api/admin/login-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      if (!res.ok) return null;
      return await res.json() as { exists: boolean; email_verified: boolean; is_active: boolean };
    } catch {
      return null;
    }
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
        // Check why login failed
        const status = await checkLoginStatus(email);
        if (status?.exists && !status.email_verified) {
          setError("Please verify your email address. Check your inbox for a verification link.");
        } else if (status?.exists && !status.is_active) {
          setError("Your account is pending activation by an administrator.");
        } else {
          setError("Invalid email or password.");
        }
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
    <div className="flex min-h-screen flex-col bg-white">
      <Header title="GGSA Admin Portal" />

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold" style={{ color: "#1C3FCF" }}>
              Admin Sign In
            </h1>
            <p className="mt-1 text-sm text-slate-700">
              Sign in to manage sponsorships
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-6 shadow-sm"
          >
            <div className="mb-5">
              <label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-800">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
                placeholder="you@example.com"
              />
            </div>

            <div className="mb-5">
              <label htmlFor="password" className="mb-1 block text-sm font-semibold text-slate-800">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-md px-5 py-3 font-semibold text-white"
              style={{ background: "#1C3FCF", opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>

            <p className="mt-4 text-center text-sm text-slate-700">
              Don&apos;t have an account?{" "}
              <Link href="/admin/register" className="font-medium text-[#1C3FCF] hover:underline">
                Register
              </Link>
            </p>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
